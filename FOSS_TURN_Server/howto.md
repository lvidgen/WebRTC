## How to Self-Host an (Almost) Free, Open Source TURN Server:
The WebRTC implementation posted [here](https://github.com/lvidgen/WebRTC) relies on the PeerJS Cloud Server. It's pretty reliable (I haven't seen any major outage in 5+ years), but hitching yourself to someone else's wagon always carries an element of risk - if they decide to pull the pin on their project that page will die, presumably without any warning.

A secondary concern is that the Cloud Server relies on Google's TURN server when a TURN server is required. Google has a [history](https://killedbygoogle.com) of axing services and products, sometimes with little or no notice. Additionally, some people have privacy concerns about running their data through anything associated with the big G.

So is it possible to create an independant, open source TURN server that you completely control at minimal expense? Yes it is, with the possible irony that here we are relying on the free tier of Oracle Cloud Infrastructure (OCI). Plenty of people have been burnt by Oracle in the past as they too have a history of axing services. If you're going this route, it's a good idea to keep backups elswhere. 

Anyway. Here's what I did:

### 1. Get a domain name
You will need this later because you will need SSL. This is the only thing on this list that will cost money. There are so many providers around and so many options that we're not going to go into details here. Basically, just find a name you like and pay the money to get it registered.

### 2. Sign up for the Oracle Free Tier
You can do this [here](https://www.oracle.com/cloud/free/). You will need to enter credit card information, but if you never sign up for additional services or click on the "upgrade account" button you will stay on the free tier forever*. The free tier is more than enough compute resources for what we are doing here

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
| All           | TCP           | 49152-65535                    |  Ports used by Coturn for data transfer                                                                                 |
| All           | UDP           | 49152-65535                    |  Ports used by Coturn for data transfer                                                                                 |
| All           | TCP           | 22                    |  SSH communication with the server                                                                                 |
| All           | TCP           | 9000                    |  PeerJS server listening port                                                                                 |
| All           | UDP           | 9000                    |  PeerJS server listening port                                                                                 |
| All           | TCP           | 80                    |  Webserver unsecure port (http://)                                                                                 |
| All           | UDP           | 80                    |  Webserver unsecure port (http://)                                                                                 |
| All           | TCP           | 443                    |  Webserver secure port (https://)                                                                                  |
| All           | UDP           | 443                    |  Webserver secure port (https://)                                                                                  |
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
ssh -i your_private_key_name.key ubuntu@152.70.124.60
```

The first time you attempt access you will be asked to confirm:
![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/ssh.png "SSH confirmation")

Type "yes". If everything has gone how it should you should now be looking at a linux command prompt with the username ubuntu. Most likely there will be a message saying that the update list is old. This is because Oracle posted the VM image that you used a while ago. It's best practice to keep your system updated anyway, so run the following and wait a while while it exectutes:
```
sudo apt update && sudo apt upgrade
```

### 7. Fire up a web server
We'll be using a web server for a couple of things and while there are a few options, [nginx](https://nginx.org/en/) suits all our needs. To install it, just run:
```
sudo apt install nginx
```
Once it's done, check the status:
```
systemctl status nginx
```
![alt text](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/images/nginx.png "nginx status")

You might be tempted now to try to access the webserver by pointing your browser at http://152.70.124.60 (or whatever your IP address is). Not so fast! Much like your security list, the ports on your server are configured to deny all traffic unless it is allowed. You can list the open ports by issuing the following command:
```
sudo iptables -t filter -nv -L INPUT --line-numbers -nv
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
Now you're ready to check your web server - navigate to http://152.70.124.60/ (exchanging your own public IP of course). If you can see the "Welcome to nginx" page, you're ready to move on :)  
