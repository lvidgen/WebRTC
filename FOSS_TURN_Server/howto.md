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

From the main menu, click on the "hamburger" menu at top left, then Networking, then Virtual Cloud Networks
