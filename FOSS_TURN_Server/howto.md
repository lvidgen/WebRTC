## How to Self-Host an (Almost) Free, Open Source TURN Server:
The WebRTC implementation posted [here](https://github.com/lvidgen/WebRTC) relies on the PeerJS Cloud Server. It's pretty reliable (I haven't seen any major outage in 5+ years), but hitching yourself to someone else's wagon always carries an element of risk - if they decide to pull the pin on their project that page will die, possibly without much warning.

A secondary concern is that the Cloud Server relies on Google's TURN server when required. Google has a [history](https://killedbygoogle.com) of axing services and products, sometimes with little or no notice. Additionally, some people have privacy concerns about running their data through anything associated with the big G.

So is it possible to create an independant, open source TURN server that you completely control at minimal expense? Yes it is, with the possible irony that here we are relying on the free tier of Oracle Cloud Infrastructure (OCI). Plenty of people have been burnt by Oracle in the past as they too have a history of axing services. If you're going this route, it's a good idea to keep backups elsewhere. 

Anyway. Here's what I did:

### 1. Get a domain name
You will need this later because you will need SSL. This is the only thing on this list that will cost money. There are so many providers around and so many options that we're not going to go into details here. Basically, just find a name you like and pay the money to get it registered.

### 2. Sign up for the Oracle Free Tier
You can do this [here](https://www.oracle.com/cloud/free/). You will need to enter credit card information, but if you never sign up for additional services or click on the "upgrade account" button you will stay on the free tier forever*. The free tier is more than enough compute resources for what we are doing here.

\* Or that's what they're saying for now, anyway...

### 3. Create a new subnet
Once you have your Oracle acount set up the first thing you want to do is create a new subnet for your server to sit on. This is particularly important if you're going to create more VMs. Port security in OCI is handled via Security Lists which are then assigned to subnets. All machines sitting on the same subnet will have the same ports accessible (on the server side, more on this later) and this TURN server needs a range of fairly exotic ports opened up. If you're unfamiliar with subnetting, here is a very brief overview. The Virtual Cloud Network that you are assigned will probably have an IPV4 block that looks like this: 10.0.0.0/16, which means that there are 65,534 useable IP addresses. You want to carve out some of those IP addresses into a separate pool (a subnet), so when creating that subnet you need to specify that the first IPv4 CIDR Block will be 10.0.0.0/24 (giving you 254 useable IPs). A second subnet could be 10.0.1.0/24 (giving you a second "pool" of 254 useable IPs).

From the main menu, click on the "hamburger" menu at top left, then Networking, then Virtual cloud networks:
![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/vcn.png "Accessing the VCN")

You will see the default VCN (you can only have one in the free tier). Click on that, and then "Subnets" on the left-hand menu (if it's not already selected). You will see the default subnet listed, probably with an IPv4 CIDR Block of 10.0.0.0/24. If the /24 is any other number, click the 3 dots at the right to edit, then change the Mask to 24 and Save Changes. Back on the main screen, click Create New Subnet, give it a name (TURN Server Subnet will do), specify the IPv4 CIDR Block of 10.0.1.0/24 and then the Create Subnet button. Back on the main screen, click on "Security Lists" on the left hand menu

### 4. Create the Security List
The security list is like a firewall for your subnet - it dictates what kind of traffic is allowed to go to which ports. If something isn't explicitly allowed here, it will be denied. The machine that we are running will host 4 servers - [PeerJS](https://github.com/peers/peerjs-server), which puts a wrapper around the WebRTC Communication protocol, [CoTurn](https://github.com/coturn/coturn) a relay server which facilitates peer to communication when hosts are behind a NAT, [coturn-credential-api](https://github.com/ezrarieben/coturn-credential-api) a credentials server you can use with CoTurn's REST API to require authentication to the server and prevent abuse, and [nginx](https://nginx.org/en/) a web server that we will use to serve web pages. Each of these needs to be reachable, so needs ports open. We will also be opening a couple of ports for connectivity testing.

Click the Create Security List button, then "add another ingress rule" and enter the following (note that once you've entered information for one rule there is an "Add another ingress rule" button at the bottom:
| Source CIDR   | IP Protocol   | Destination Port Range  | Description                                                                       |
| ------------- |---------------| ------------------------| ----------------------------------------------------------------------------------|
| All           | TCP           | 3478                    |  TLS TCP Listening port for Coturn Server                                                                                 |
| All           | UDP           | 3478                    |  TLS UDP Listening port for Coturn Server                                                                                 |
| All           | TCP           | 5349                    |  DTLS TCP Listening port for Coturn Server                                                                                 |
| All           | UDP           | 5349                    |  DTLS UDP Listening port for Coturn Server                                                                                 |
| All           | UDP           | 49152-65535                    |  Coturn relay ports                                                                                 |
| All           | TCP           | 22                    |  SSH communication with the server                                                                                 |
| All           | TCP           | 9000                    |  PeerJS server listening port                                                                                 |
| All           | UDP           | 9000                    |  PeerJS server listening port                                                                                 |
| All           | TCP           | 80                    |  Webserver unsecure port (http://)                                                                                 |
| All           | TCP           | 443                    |  Webserver secure port (https://)                                                                                  |
| All           | ICMP           | N/A                    |  Used to "ping" server                                                                                |

Once you have entered all the rules, Click on the "Create Security List" button at the bottom. Back on the main screen, click on "Subnets" on the left menu, then on the name of the subnet you just created, then on the "Add Security list" button, select the list you just created from the menu and click the "Add Security List" button at the bottom.  

### 5. Save a configuration
So now it's finally time to actually make the server! The temptation now would be to jump in and create an Instance (what Oracle calls a Virtual Machine) but sometimes when you try this, Oracle is temporarily out of space and the process fails, meaning that you have to start all over again from scratch. So with a couple of extra clicks we can save the configuration and try again any time we like at the click of a button.

From the hamburger menu at the top left, select Compute" then "Instance Configurations" and click the "Create Instance configuration" button. A couple of things to note here before you move on: At the time of writing, you basically have the equivalent of 4 OCPUs and 24 GB of memory to play with. This is across your entire account, and how you use them is up to you. You could make one machine with 4 OCPUs and 24 GB of memory or you could make 4 machines with 1 OCPU and 6 GB of memory of memory each. You can edit these amounts later, but it's worth keeping in mind at this point. Give the configuration a name and move to the section below.

#### Selecting an image
In the "Image and shape" section, click the link to edit. Click the "change image" button, select "Ubuntu" and check the box next to the latest Canonical Ubuntu version you can see (build numbers are available by clicking the down arrow at right, but whatever is at the top of the list should be fine) and then on the "Select image" button at the bottom. 

#### Selecting a shape
Back on the main screen, click the "Change shape" button. Select "Ampere (Arm-based processor)" and check the box next to the shape that appears on the list (VM.Standard.A1.Flex at the time of writing). A section below appears where you can configure the amount of CPU and memory your server will use. This one is completely up to you, but 1 OCPU and 9GB of memory works fine. If you are not planning on crfeating any other VMs in your free tier you might as well max it out with 4 OCPUs and 24 GB of memory. Once you're done, click "Select shape". 

#### Nominating the subnet
In the Primary VNIC information section, leave everything as default but at the bottom make sure that the subnet that is shown is the one you just created - "TURN Server Subnet" was the example name given above - and not the default one. ***This step is very important.*** If the machine is created on the wrong subnet there's nothing you can do but delete it and start again. 

#### Adding SSH keys
Leave the Primary VNIC IP addresses section as default and move to the "Add SSH keys" section. SSH is how you will interact with the remote server from your local computer. If you already have SSH keys that you would like to use to access this server, select upload public key files and do that. Otherwise select "Generate a key pair for me" and save the private key in a place you will remember and with a name that makes sense - we'll use turn_server.key for this example.

Leave everything else as default and click the "Create" button at the bottom of the screen.

#### Creating the server
Now click on the name of the configuration that you just created and click the "Launch instance" button. This will open up a similar screen to the Instance configuration one you were just on. You may notice a little window at the bottom with a cost summary telling telling you that the boot volume will cost a couple of bucks a month. This is due to a [bug in the cost analyser tool](https://www.reddit.com/r/oraclecloud/comments/14pg5dr/oracle_always_free_service_have_boot_volume_cost/) you can ignore this - you won't be charged for the above configuration. 

Click the "Create" button. With any luck you will be taken to another screen that will say "Provisioning" for a minute or so and then "Running". If you stay on the same screen and get an Out of Capacity error, try clicking the Create button again. If you get the same error, leave it for half an hour and try again. Out of capacity errors used to be very common, but it seems that Oracle has freed up more space and you can usually get an Instance running on the first try. If you are experiencing long delays, you could consider [automating the process with Python](https://github.com/mohankumarpaluru/oracle-freetier-instance-creation) or if you're looking for something simpler, an auto-clicker might do the trick, provided you are on the page with the Create button showing - just paste this into your console and hit Enter: 
```
setInterval(function(){document.querySelectorAll(".oui-button.oui-button-primary")[1].click()},60000)
```
#### Testing the server
Whichever way you created it, you should now be looking at the running server screen. Copy the Public IP address from the right side of the screen, open up a command prompt and try pinging your server:

![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/ping.png "Pinging the server")

Yay. We have connectivity. Let's SSH into the server and start setting it up.

### 6. Access the server via SSH
In the command prompt, navigate to the folder where you saved your private SSH key file, then enter the following command, replacing the name of the key file that you saved and the IP address:
```
ssh -i your_private_key_name.key ubuntu@your_public_ip_address
```

The first time you attempt access you will be asked to confirm:
![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/ssh.png "SSH confirmation")

Type "yes". If everything has gone how it should you should now be looking at a linux command prompt with the username ubuntu. Most likely there will be a message saying that the update list is old. This is because Oracle posted the VM image that you used a while ago. It's best practice to keep your system updated anyway, so run the following and wait a while while it exectutes:
```
sudo apt update && sudo apt upgrade
```

### 7. Fire up a web server
#### Configure DNS
Now that you've got an IP address, you can set up DNS to point your domain name at it. This may seem premature, but DNS changes take a while to propagate through the network, so we might as well do it now and we can work on other things while that takes effect. Just log into the account where you bought your domain name, find the section where you can edit (or create) A records and make sure you have an A record with your domain name as the host name (without the http..., so example.com for example) and your public IP address as the value. For ease at this point, add another A record with your domain name plus the www (so www.example.com) and your public IP address as the value. As a quick check to see if the changes have porpagated you can ping your domain name - if the results come back showing your public IP address you're in business. Sometimes it's instant, sometimes it takes a while. If it takes any longer than a few hours it's probably worth contacting your domain hosting company to see if there's a problem. 

#### Install nginx
We'll be using a web server for a couple of things and while there are a few options, [nginx](https://nginx.org/en/) suits all our needs. To install it, just run:
```
sudo apt install nginx
```
Once it's done, check the status:
```
systemctl status nginx
```
![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/nginx.png "nginx status")

#### Open up some ports
You might be tempted now to try to access the webserver by pointing your browser at your IP address. Not so fast! Much like your security list, the ports on your server are configured to deny all traffic unless it is allowed. You can list the open ports by issuing the following command:
```
sudo iptables -t filter -nv -L INPUT --line-numbers
```
A lot of tutorials on the web will tell you that this is what you want to do:
```
sudo iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
```
Run it, then run but the previous command to list the open ports. You see that the problem is that the -A flag appends the rule to the end of the list, after the REJECT all rule. So a packet will never reach this rule. What we want is to insert rules before that reject statement, the easiest way being to use the -I flag instead, followed by the line number where you want to insert the rule (here we are using 2, so these rules will end up on lines 2 and 3 of the INPUT and OUTPUT chains). Below are the four rules that nginx needs:
```
sudo iptables -I INPUT 2 -p tcp --dport 80 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
sudo iptables -I OUTPUT 2 -p tcp --sport 80 -m conntrack --ctstate ESTABLISHED -j ACCEPT
sudo iptables -I INPUT 2 -p tcp --dport 443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
sudo iptables -I OUTPUT 2 -p tcp --sport 443 -m conntrack --ctstate ESTABLISHED -j ACCEPT
```
One additional advantage of using the --line-numbers flag when listing rules is that you can delete rules by line number. If we wanted to delete rule 20 on the INPUT chain we could just do:
```
sudo iptables -D INPUT 20
```
One more thing we want to do with iptables: by default, these rules are not persistent, so if you ever restart your server you will have to set them all up again. You need to save changes to your iptables file by calling this command:
```
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
```
Now you're ready to check your web server - if you can successfully ping your domain name you should be able to browse to it. Navigate to http://your_domain_name. You'll probably see a scary looking message about how the site is insecure. We'll fix that soon. Just click on "Proceed anyway" (or something like that, depending on the browser). If you can see the "Welcome to nginx" page, you're ready to move on :)  

#### Install a TLS certficate
To get rid of that scary warning message we need to install a TLS certificate so that our plain ol http site will use the more secure https protocol. Thankfully the folks at the [EFF](https://eff.org) have made this a very simple process.  
You can read detailed instructions [here](https://certbot.eff.org/instructions?ws=nginx&os=snap), but basically:

`sudo snap install --classic certbot` installs the Certbot tool

`sudo ln -s /snap/bin/certbot /usr/bin/certbot` ensures that Certbot can be run

`sudo certbot --nginx` gets a certificate, asks you a few configuration questions and turns on https

`sudo certbot renew --dry-run` (optional) tests the automated renewal procedure - with this running you should always have a valid certificate 

If everything worked OK you should now be able to refresh your browser page and you will see that your site is being served with the https protocol

### 8. Make a sample web app
#### Take ownership of the web files folder
It's time to start uploading some files to our web server, but before we do that we want to take over ownership of the directory that nginx uses to serve webpages. If we don't, we'll have to add "sudo" to the start of every command which is annoying. The defult location for web files is in /var/www/html, so to check ownership we can run
```
ls -l /var/www/html
```
We see that root is the owner. To change that we change the owner of the directory and everything inside it to be the currently logged in user:
```
sudo chown -R $USER /var/www/html
```
While we're here, make a folder for a sample app to go in: `mkdir /var/www/html/peertest` 

##### Upload a sample app
Below is an HTML page with a simple WebRTC chat app that we can use to test connectivity:
```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Simple RTC Chat</title>
  <style>
  #peer_id{display:none}
  #chat_id{display:none;}
  </style>
</head>
<body>
<h1>Simple RTC Chat</h1>
<div id ="info"></div>
<div id ="id_div">Choose an ID: <input id ="myid"/>
<button id = "sub_id_btn">Submit</button>
</div>
<div id ="peer_id">Enter your friend's ID or wait for a connection: 
<input id ="peerid"/><button id = "sub_peer_btn">Submit</button>
</div>    
<div id="chat_id">Enter message: 
<input id ="msg"><button id = "send_msg">Send</button><br><textarea id="chat" rows="50" cols="50"></textarea>
</div>  
  <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
  <script>
  (function() {
      let peer = null;

      function getById(str) {
          return document.getElementById(str)
      }

      getById("chat").value = "";

      getById("sub_id_btn").onclick = function() {
          peer = new Peer(getById("myid").value);
          getById("id_div").style.display = "none";
          getById("peer_id").style.display = "block";
          peer.on('connection', function(conn) {
              setConnection(conn);
          });
      }

      getById("sub_peer_btn").onclick = function() {
          conn = peer.connect(getById("peerid").value);
          conn.on('open', function() {
              setConnection(conn);
           });
      }

      function setConnection(conn) {
		  getById("info").innerHTML="Connected as "+peer.id+", chatting with "+conn.peer;
          getById("chat_id").style.display = "block";
          getById("peer_id").style.display = "none";
          getById("send_msg").onclick = function() {
              let msg = peer.id + ": " + getById("msg").value + "\n";
              getById("chat").value += msg;
              conn.send(msg);
          }
          conn.on('data', function(data) {
              getById("chat").value += data;
          });
      }
  })()
  </script>
</body>
</html>
```

Save it on your computer with the filename "index.html" in the same folder where you saved your private SSH key. You can try it out by opening it in a browser and opening another copy in a different tab. In a real app you would have more error handling - the big one to watch for here is to make sure that the two connections use different IDs.

To upload the file to the folder that you just made, open up a regular command prompt (not the one you're using to SSH into the server), navigate to the directory where you have the index.html and private key files and issue the following command:
```
scp -i your_private_key_name.key index.html ubuntu@your_public_IP:/var/www/html/peertest
```
If everything is working correctly, you should now be able to access the page at https://your_domain_name/peertest

### 8. Install your own PeerJS server
As mentioned before, using PeerJS the way we do above means that it connects to the PeerJS server, which itself uses Google's TURN server when required. To get more control over the stack we need to create our own PeerJS server. You can see the project page [here](https://github.com/peers/peerjs-server), but basically:
#### Install npm and the PeerJS Server
The PeerJS server is available through the Node Package Manager, which itself relies on node.js so we have some installing to do, But first we have a problem. We can run `sudo apt-cache policy nodejs` to see what version of nodejs we are going to get if we install it from the repository, and what the output tells us is that we're going to get:
> Candidate: 10.19.0~dfsg-3ubuntu1.6

But when we look at PeerJS in npm, it says that we need 14 or above:
![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/peerjs.png "Peer JS specs in the npm library")

So we need to install another way, directly from the source. Version 20 is the latest at time of writing, so let's go for that...:
```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```
The nice thing about installing from nodesource is that npm is already installed, so now we can install peer right away...
```
sudo npm install peer -g
```
#### Test the PeerJS Server
Fire up the server with the following command:
```
peerjs --port 9000 --key peerjs --path /myapp
```
then point your browser at `http://your_domain_name:9000/myapp` - if everything is working you will get a small JSON response with details about PeerJS name, description and website.

So it's working, but there are a couple of problems:
* The server is running as a foreground process. Getting a command prompt back in the terminal or closing the terminal window will mean killing the server 
* We're using the unsecure http protocol

Hit Ctrl + C to stop the PeerJS server, then type the following command to open a screen session. Screen is a program that allows us to push processes to the background where they keep running regardless of what we do with the main terminal window. We're going to give our session a name so it's easier to reference later. You do this with the -S flag:
```
screen -S peerjs_screen
```
A regular, empty command prompt should have opened up. Now we can start the server, but supply it with the ssl certificates that we got from certibot previously, ensuring a secure connection:
```
sudo peerjs --port 9000 --key peerjs --path /myapp --sslkey /etc/letsencrypt/live/your_domain_name_here/privkey.pem --sslcert /etc/letsencrypt/live/your_domain_name_here/fullchain.pem
```
The server should start. Hit Ctrl + a and then d to detach from the screen, which should get you back to the main terminal window. Now you can test `https://your_domain_name:9000/myapp` - it should return the same response that you got when browsing to the http version.

#### Point the web app at your PeerJS server 
Open up your app's index.html file in a text editor like nano:
```
nano /var/www/html/whatever_you_called_your_app_directory/index.html
```
and look for this line: `peer = new Peer(getById("myid").value);`
We want to change that to:
```
peer = new Peer(getById("myid").value,
                  {host: "your_domain_name",
                   port: 9000,
                   key: "peerjs"
                   secure: true,
                   path: "/myapp"
                  });
```

Save your changes (Ctrl + o, enter to confirm), refresh your webpages and test the connection. It should connect the same as before. You can see the server connections by reattaching the screen session:
```
screen -r peerjs_screen
```
![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/peerjs_conn.png "PeerJS server connections")

### 9. Install your own STUN/TURN server
We've almost got end-to-end control, the only thing missing is that PeerJS is still using Google servers. But we can tell it to use our own implementation of [coturn](https://github.com/coturn/coturn) instead.

#### Install and configure coturn:
Installation is simple:
```
sudo apt install coturn
```
Save a fresh copy of the config file just in case:
```
sudo cp /etc/turnserver.conf /etc/turnserver_bak.conf
```
Edit the config file:
```
sudo nano /etc/turnserver.conf
```
You'll see that there are a lot of options here. As a minimal example, you can leave most commented out and just uncomment the following lines:
```
listening-port=3478
tls-listening-port=5349
listening-ip=the_Private_IPv4_address_of_your_Oracle _instance
external-ip=the_Public_IPv4_address_of_your_Oracle _instance
verbose
fingerprint
user=turnuser:turn456
log-file=/var/log/turn.log
simple-log
```
save the changes, then restart the coturn server:
```
sudo systemctl restart coturn
```
#### Open up the coturn ports
Back to our iptables. We need to open up the 3478 and 5349 listening ports and also the udp relay endpoints (set as 49152-65535 by default in the config file) 
```
sudo iptables -I INPUT 2 -p tcp --dport 3478 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
sudo iptables -I INPUT 2 -p udp --dport 3478 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
sudo iptables -I INPUT 2 -p tcp --dport 5349 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
sudo iptables -I INPUT 2 -p udp --dport 5349 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
sudo iptables -I INPUT 2 -p udp --dport 49152:65535 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
```

#### Test the coturn server connectivity
We can test the connection using [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)

Let's start with the simplest test: enter `STUN:your_domain_name:3478` in the STUN or TURN URI box, click "Add server", scroll down and click "Gather cadidates". In the output there should be an srflx type response listed:

![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/stuntest.png "STUN test")

Let's test the TURN server: enter `TURN:your_domain_name:3478` in the STUN or TURN URI box, turnuser in the username box and turn456 in the password box (these were defined in your config file) and click "Add server", scroll down and click "Gather cadidates". In the output there will probably be an srflx type response listed again, along with a relay type:

![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/turntest.png "TURN test")

Cool. So we can connect to port 3478, but we really want to connect to the TLS listenting port, 5349. Even a simple STUN test fails there. We need to include paths to our SSL files in the config file, but here's something annoying: the Let's Encrypt folder where they're currently kept is owned by root and coturn does not have access to it, not even when the root user starts it. There are two not great options here: one is to edit the `/lib/systemd/system/coturn.service` file and make the User and Group equal root so that coturn runs as root. If that seems a little nuclear, make a new folder, copy the files there and change the permissions so that turnserver can access them:

```
sudo mkdir /etc/turnservercerts
sudo cp /etc/letsencrypt/live/your_domain_here/fullchain.pem /etc/turnservercerts
sudo cp /etc/letsencrypt/live/your_domain_here/privkey.pem /etc/turnservercerts
sudo chown turnserver:turnserver /etc/turnservercerts -R
sudo chmod 600 /etc/turnservercerts -R
```
Either way you go, you will then add these two lines to the config file (with paths to the original key files if you went for the first "run as root" option):
```
pkey=/etc/turnservercerts/privkey.pem
cert=/etc/turnservercerts/fullchain.pem
```
Save the changes, then restart coturn:
```
sudo systemctl restart coturn
```

Now let's try with `TURN:your_domain_name:5349` in the STUN or TURN URI box, turnuser in the username box and turn456 in the password box:

![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/turn5349.png "TURN connecting to TLS port 5349")

If this all looks good, it's time to edit our web app to point it at our coturn server.

### 10. Point your web app at your coturn server
PeerJS gives us the option to specify the STUN and TURN servers that we want to use when we are connecting to our PeerJS server. At the moment, our index.html creates a Peer object like this:
```
peer = new Peer(getById("myid").value,
                  {host: "your_domain_name",
                   port: 9000,
                   key: "peerjs",
                   secure: true,
                   path: "/myapp"
                  });
```

We want to change that to this:
```
peer = new Peer(getById("myid").value,
		  {host: "your_domain_name",
        port: 9000,
        key: "peerjs",
        secure: true,
        path: "/myapp",
		config: {
            iceServers: [
                {
                    urls: "stun:your_domain_name:5349",
               },
                {
                    urls: "turn:your_domain_name:5349",
                    username: "turnuser",
                    credential: "turn456"
               }]
			   }
		  });
```

Save your changes, reload your webpages and try getting connected - everything should be working as before, which means we only have one thing left to do...

### 11. Add some authentication
Security-wise, The problem with the above is fairly obvious - our username and password (credential) is in the JavaScript and there in plain text for everybody to see, which means that anybody could use the above configuration in their app, piggybacking off your TURN server. It's kind of a limitation of WebRTC in general, but there are a couple of things we can do to mitigate the problem.

Coturn allows authentication via REST API that generates a time sensitive username and password (more details can be found in [Justin Uberti's Internet-Draft](https://datatracker.ietf.org/doc/html/draft-uberti-behave-turn-rest-00)), so we can use the [coturn-credential-api](https://github.com/ezrarieben/coturn-credential-api) to generate time sensitive credentials in a format understood by Coturn.

#### Install the API files
We're going to need to unzip the zip file, so we might as well install unzip now:
```
sudo apt install unzip
```
Go to your web directory, get the file, unzip it and move the utility files to a top-level folder called creds:
```
cd /var/www/html
wget https://github.com/ezrarieben/coturn-credential-api/archive/main.zip
unzip main.zip
sudo mv coturn-credential-api-main/public creds
```

#### Configure the API to work with coturn
First thing we need to do is generate a private and public key. For this example, I'll be using these:
public: Z8e8mjfuHP3wipwGXNydqm4YJ
private: QCi3oHmnTuKhVE9hiyL5UpfUd 

Open up `config.inc.php` in your creds folder and paste in the values:
```
define('TURN_AUTH_SECRET', "your_private_key_here"); // Auth secret defined in CoTURN server config
define('CREDENTIAL_TTL', 86400); // TTL of credentials in seconds
define('ALLOWED_API_KEYS', array(
    'your_public_key_here'
));
```

Now we need to add the private key to `/etc/turnserver.conf` and comment out the line that allows for static user credentials:
```
#user=turnuser:turn456
static-auth-secret=your_private_key_here
```
Save the changes and do a `sudo systemctl restart coturn` to restart the server with the new configuration.

#### Set up the server to serve php files
The coturn-credential-api is written in php. Some Linux distributions come with php installed, but the Oracle version of Ubuntu does not, so we're going to have to install it. To save further installations later, well install the version that works with nginx. We check which version of php is available in your respository:
```
apt-cache policy php
```
At the time of writing, it was 7.4, so we want php7.4-fpm (you can read about fpm [here](https://php-fpm.org/)):
```
sudo apt install php7.4-fpm
```
Now we need to edit the nginx configuration to work with php and fpm.
```
sudo nano /etc/nginx/sites-available/default
```
Scroll down to the server config block where the server_name has been set by Certbot and add index.php to the list so that it reads like this:
> index index.php index.html index.htm index.nginx-debian.html;

In the same block, remove the comments from the section titled "# pass PHP scripts to FastCGI server" so that it looks like this:
```
location ~ \.php$ {
                include snippets/fastcgi-php.conf;
        #
        #       # With php-fpm (or other unix sockets):
                fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        #       # With php-cgi (or other tcp sockets):
        #       fastcgi_pass 127.0.0.1:9000;
        }
```

Save your changes and reload nginx and php:
```
sudo systemctl restart nginx
sudo systemctl reload php7.4-fpm
```

### 12. Edit the web app
Time for one last edit on our index.html file. For clarity, we're going to rewrite the entire `getById("sub_id_btn").onclick` function, which should now look like this:

```
getById("sub_id_btn").onclick = function() {
      let myname = getById("myid").value,
        params = {
            username: myname,
            key: "your_public_key_here",
        },

        options = {
            method: "POST",
            body: new URLSearchParams(params),
        };

    fetch("https://your_domain_name/creds/", options)
        .then(response => response.json())
        .then(data => {
            let creds = data.data;
            peer = new Peer(myname, {
                host: "your_domain_name",
                port: 8999,
                key: "peerjs",
                secure: true,
                path: "/myapp",
                config: {
                    iceServers: [{
                            urls: "stun:your_domain_name:5349",
                        },
                        {
                            urls: "turn:your_domain_name:5349",
                            username: creds.username,
                            credential: creds.password
                        }
                    ]
                }
            });

            getById("id_div").style.display = "none";
            getById("peer_id").style.display = "block";
            peer.on('connection', function(conn) {
                setConnection(conn);
            });

            getById("sub_peer_btn").onclick = function() {
                conn = peer.connect(getById("peerid").value);
                conn.on('open', function() {
                    setConnection(conn);
                });
            }
        });
}
```
If you can get a connection, we're basically done.

### 13. Tightening and tidying
The above is a fairly minimal example, but in real life you wouldn't stop here - there are a couple of things you would want to look at before you wold be comfortable leaving this running unattended.

#### Authentication
This app is designed with ad-hoc connections in mind, where a user chooses their own username and just connects without an account. This necessarily exposes the credentials mechanism in the JavaScript. The coturn server allows for a range of more robust database-based authentication methods that would involve creating accounts, etc.

What we have in place now prevents abuse in that it doesn't expose login details for your TURN server that can be used for longer than 24 hours (this time limit can be set in the credentaials API `config.inc.php` file), so a super-naive "bad actor" would have to come back to the app once a day to get new credentials. A slightly more sophisticated bad actor could just include the "fetch" function in their own code and authenticate that way. A simple way to prevent that kind of abuse would be to edit the line in the `index.php` file of the credentials API to not accept cross-origin resource sharing (CORS), or restrict it to certain domains. The PeerJS server also has a CORS option that you can stipulate when starting the server.

#### Security list and Firewall
We opened a bunch of ports for testing that we don't really need open any more and best practice would be to close them, both on the server's security list and in iptables. For the above setup, all we really need open is:
* 22 for SSH communication
* 443 for web traffic
* 9000 for the peerJS server
* 5349 for the Coturn listening port
* 49152-65535 for Coturn relay ports

Everything else can be shut down.  

