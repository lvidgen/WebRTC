            (function () {
		//		document.getElementById("mopener").checked=false;
                var lastPeerId = null;
                var peer = null; // Own peer object
                var peerId = null;
                var conn = null;
                var userId = document.getElementById("myId");
                var message = document.getElementById("messageArea");
                var sendMessBox = document.getElementById("sendMessageBox");
                var sendButton = document.getElementById("sendButton");
				var connectButton = document.getElementById("connectTo");
				var recvIdInput = document.getElementById("peerId");
				var logMess = document.getElementById("logMessage");
				var conDiv = document.getElementById("peerDeets");
				var myName = null;
				var theirName = null;
				

                /**
                 * Create the Peer object for our end of the connection.
                 *
                 * Sets up callbacks that handle any events related to our
                 * peer object.
                 */
					function getId (){
                    // Create own peer object with connection to shared PeerJS server
					var nameBox = userId;
					myName= nameBox.value;
                    peer = new Peer(myName, {
                        debug: 2
                    });
					
					peer.on('error', function(err) { 
					if(err.type =='unavailable-id'){
					logMess.innerHTML="That username has already been taken. Please choose another: ";
					nameBox.value = "";
					}
					});
					
                    peer.on('open', function (id) {
                        // Workaround for peer.reconnect deleting previous id
                        if (peer.id === null) {
                            console.log('Received null id from peer open');
                            peer.id = lastPeerId;
                        } else {
                            lastPeerId = peer.id;
                        }
					logMess.innerHTML="Logged in as "+ myName+".";
					document.getElementById("logInForm").style.display="none";
					conDiv.style.display="block";
                    });
                    peer.on('connection', function (c) {
                        // Allow only a single connection
                        if (conn) {
                            c.on('open', function() {
                                c.send("Already connected to another client");
                                setTimeout(function() { c.close(); }, 500);
                            });
                            return;
                        }

                        conn = c;
						theirName = conn.peer;
						showLogIns();
                        ready();
                    });

					}
			        function join() {
                    // Close old connection
                    if (conn) {
                        conn.close();
                    }

                    // Create connection to destination peer specified in the input field
                    conn = peer.connect(recvIdInput.value, {
                        reliable: true
                    });

                    conn.on('open', function () {
					theirName = conn.peer;
					showLogIns();		
                    });
                    // Handle incoming data (messages only since this is the signal sender)
                    conn.on('data', function (data) {
                        addMessage(theirName+": " + data);
                    });
                    conn.on('close', function () {
                        status.innerHTML = "Connection closed";
                    });
                };
					
					function showLogIns(){			
                        logMess.innerHTML+=" Connected to "+theirName+".";
						conDiv.style.display="none";
						document.getElementById("sendarea").style.display="grid";
					//	document.getElementById("burger").style.display="inline";
					}
					
					
				    function ready() {
                    conn.on('data', function (data) {
                        switch (data) {
                             default:
                                addMessage(theirName+": " + data);
                                break;
                        };
                    });
                    conn.on('close', function () {
                        status.innerHTML = "Connection reset<br>Awaiting connection...";
                        conn = null;
                        start(true);
                    });
                }
				
			function addMessage(msg) {
			var dv = document.createElement("div");
			dv.appendChild(document.createTextNode(msg));
			message.appendChild(dv);
			dv.scrollIntoView(false);
			}
			
			function sendIt(){
                    if (conn.open) {
                        var msg = sendMessageBox.value;
                        sendMessageBox.value = "";
                        conn.send(msg);
                        addMessage(myName+": " + msg);
                    }			
			}
			
			function pressEnter(e, func){
				if(e.key == 'Enter'){
					func();
					}
			}
	
			
			document.getElementById("menu").onclick=function(e){
			switch (e.target.id){
				case "screen":
				shareScreen();
				break;
			}
			}
			
			document.getElementById("logIn").addEventListener('click', getId);		
			
			connectButton.addEventListener('click', join);

			sendButton.addEventListener('click', sendIt);
			
			userId.addEventListener('keyup', function (e) {
				pressEnter(e, getId)
			});
			
			recvIdInput.addEventListener('keyup', function (e) {
				pressEnter(e, join)
			});
			
			sendMessBox.addEventListener('keyup', function (e) {
				pressEnter(e, sendIt)
			});
				
		})();