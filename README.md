# WebRTC

Chat, file and screen sharing, video calls and an interactive whiteboard using peer-to-peer WebRTC.

## Setup
Files can be run locally without having to upload anything to a server or you can try it out on the demo page. You can try it out by opening the same page in two tabs of your browser, different browsers, different devices, etc. All you need is an internet connection. 

## Some details
### Choosing a username:
Usernames can be anything alphanumeric. The only thing to make sure of is that you and the other person are not using the same username. The page will tell you if a name is already taken.

### Connections:
This app uses websockets and HTML5's Real Time Communication protocol. The initial connection is brokered through the open source [PeerJS cloud server](https://peerjs.com). If a STUN server is required, PeerJS makes use of Google's puclicly available one.
If not, no peer-to-peer data passes through the server - WebRTC allows direct communication between browsers. 

If you want more control over the dataflow it will mean setting up your own server - take a look at [How to Self-Host an (Almost) Free, Open Source TURN Server](https://github.com/lvidgen/WebRTC/blob/master/FOSS_TURN_Server/howto.md) for one implementation.
