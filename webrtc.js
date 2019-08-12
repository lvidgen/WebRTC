
				document.getElementById("mopener").checked=false;
                var lastPeerId = null;
                var peer = null; // Own peer object
                var conn = null;
				var receiveBuffer = [];
				var receivedSize = 0;
				var infilename;
				var infilesize;
				var openWins = 0;

				

                /**
                 * Create the Peer object for our end of the connection.
                 *
                 * Sets up callbacks that handle any events related to our
                 * peer object.
                 */
					function getId (){
                    // Create own peer object with connection to shared PeerJS server
					var myName= document.getElementById("myId").value;
                    peer = new Peer(myName, {
                        debug: 2
                    });

				
					peer.on('error', function(err) { 
					if(err.type =='unavailable-id'){
					document.getElementById("logMessage").textContent="That username has already been taken. Please choose another: ";
					document.getElementById("myId").value = "";
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
					document.getElementById("logMessage").textContent="Logged in as "+ peer.id+".";
					document.getElementById("logInForm").style.display="none";
					document.getElementById("peerDeets").style.display="block";
                    });
                    peer.on('connection', function (c) {
                        // Allow only a single connection
                        if (conn) {
                            c.on('open', function() {
                                c.send({tag:"msg", data: "Already connected to another client"});
                                setTimeout(function() { c.close(); }, 500);
                            });
                            return;
                        }

                        conn = c;
						showLogIns();
						});
					}
					
			        function join() {
                    // Close old connection
                    if (conn) {
                        conn.close();
                    }

                    // Create connection to destination peer specified in the input field
                    conn = peer.connect(document.getElementById("peerId").value, {
                        reliable: true
                    });

                    conn.on('open', function () {
					showLogIns();		
                    });
                };
					
					function showLogIns(){			
                        document.getElementById("logMessage").textContent+=" Connected to "+conn.peer+".";
						document.getElementById("peerDeets").style.display="none";
						document.getElementById("sendarea").style.display="grid";
						document.getElementById("main").style.display="grid";
						document.getElementById("burger").style.display="inline";	
					
					peer.on('call', function( mCon) {
						switch(mCon.metadata){
						case "vid":
						mediaConnection=mCon;
						answerCall(mediaConnection)	
						break;
						case "scrn":
						showScreen(mCon);
						break;
						};
						
					});
					ready();
					}
					
					
				    function ready() {
                    conn.on('data', function (obj) {
                        switch (obj.tag) {
							case "fileinfo":
								var fp = document.getElementById('fileProgress');
                                infilename=obj.filename;
								infilesize=obj.filesize;
								fp.style.display="inline";
								fp.value = 0;
								fp.max = infilesize;
								document.getElementById('fileText').textContent=`Receiving '${infilename}' (0/${infilesize} bytes)`;
                                break;
                             case "file":
								receiveFile(obj.data)
								break;	
							 case "msg":
                                addMessage(conn.peer+": " + obj.data);
                                break;
                        };
                    });
                    conn.on('close', function () {
                        status.innerHTML = "Connection reset<br>Awaiting connection...";
                        conn = null;
                    });
                }
				
			function addMessage(msg) {
			var message = document.getElementById("messageArea");
			var dv = document.createElement("div");
			dv.appendChild(document.createTextNode(msg));
			message.appendChild(dv);
			dv.scrollIntoView(false);
			}
			
			function sendIt(){
                    if (conn.open) {
						var msgbox = document.getElementById("sendMessageBox");
                        var msg = msgbox.value;
                        msgbox.value = "";
                        conn.send({tag:"msg", data: msg});
                        addMessage(peer.id+": " + msg);
                    }			
			}
			
			function pressEnter(e, func){
				if(e.key == 'Enter'){
					func();
					}
			}
	
			
			document.getElementById("menu").onclick=function(e){
			document.getElementById("mopener").checked=false;
			switch (e.target.id){
				case "menu_screen":
				shareScreen();
				break;
				case "menu_vid":
				shareVideo();
				break;
			}
			}
			
			document.getElementById("logIn").addEventListener('click', getId);		
			
			document.getElementById("connectTo").addEventListener('click', join);

			document.getElementById("sendButton").addEventListener('click', sendIt);
			
			document.getElementById("myId").addEventListener('keyup', function (e) {
				pressEnter(e, getId)
			});
			
			document.getElementById("peerId").addEventListener('keyup', function (e) {
				pressEnter(e, join)
			});
			
			document.getElementById("sendMessageBox").addEventListener('keyup', function (e) {
				pressEnter(e, sendIt)
			});

			//start menu items
			
			// screen sharing
			async function shareScreen() {
				  let captureStream = null;

				  try {
					captureStream = await navigator.mediaDevices.getDisplayMedia();
				  } catch(err) {
					console.error("Error: " + err);
				  }
				  var screenConnection = peer.call(conn.peer, captureStream, {metadata:"scrn"});
				  screenConnection.on('close', function() { 
				  closeMediaConn(captureStream);
					});	
			}
			
			function showScreen(scrcon){
				
				makeWindow("vid", scrcon, conn.peer+" wants to share a screen with you");
			}
			
			//video call
			async function shareVideo() {
			  let stream = null;

			  try {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
				stream.metadata="vid";
				var mediaConnection = peer.call(conn.peer, stream, {metadata:"vid"});
				showVid(mediaConnection);
			  } catch(err) {
				/* handle the error */
			  }
			}
			
			async function answerCall(vidCon) {
			  let stream = null;
			  try {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
				vidCon.answer(stream);
				showVid(vidCon);
			  } catch(err) {
				console.log(err)
				/* handle the error */
			  }
			}
			
			function showVid(vidcon){	
				makeWindow("vid", vidcon, conn.peer+" wants to call you");
			}
			
			function closeMediaConn(stream){
				console.log(stream)
			let tracks = stream.getTracks();
			tracks.forEach(track => track.stop());
			}
			
			
			//file sharing
			document.getElementById("file_inp").onchange=function(){
			  var fp = document.getElementById('fileProgress');
			  fp.style.display="inline";
			  const file = this.files[0];
			  document.getElementById('fileText').textContent=`Sending '${file.name}' (0/${file.size} bytes)`;
			  // Handle 0 size files.
			  if (file.size === 0) {
				return;
			  }
			  fp.value=0;
			  fp.max = file.size;
			  conn.send({tag:"fileinfo", filename:file.name, filesize: file.size})
			  const chunkSize = 16384;
			  fileReader = new FileReader();
			  let offset = 0;
			  fileReader.addEventListener('error', error => console.error('Error reading file:', error));
			  fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
			  fileReader.addEventListener('load', e => {
				conn.send({tag:"file", data: e.target.result});
				offset += e.target.result.byteLength;
				document.getElementById('fileText').textContent=`Sending '${file.name}' (${offset}/${file.size} bytes)`;
				fp.value = offset;
				if (offset < file.size) {
				  readSlice(offset);
				} else {
				document.getElementById('fileText').textContent=`Sent '${file.name}' (${file.size} bytes)`;
				fp.style.display="none";				
				}
			  });
			  const readSlice = o => {
				const slice = file.slice(offset, o + chunkSize);
				fileReader.readAsArrayBuffer(slice);
			  };
			  readSlice(0);
			}
			
			function receiveFile(data) {
			var fp = document.getElementById('fileProgress');
			  receiveBuffer.push(data);
			  receivedSize += data.byteLength;
			  fp.value = receivedSize;
			  document.getElementById('fileText').textContent=`Receiving '${infilename}' (${receivedSize}/${infilesize} bytes)`;
			  if (receivedSize === infilesize) {
				const received = new Blob(receiveBuffer);
				receiveBuffer = [];
				var dv = document.createElement("div");
				var lnk = document.createElement("a");
				lnk.href = URL.createObjectURL(received);
				lnk.download = infilename;
				lnk.appendChild(document.createTextNode(`Click to download '${infilename}' (${infilesize} bytes)`));
				document.getElementById('fileText').textContent=`Received '${infilename}' (${infilesize} bytes)`;
				dv.appendChild(lnk);
				document.getElementById("messageArea").appendChild(dv);
				lnk.scrollIntoView(false);
				fp.style.display="none";
				receivedSize=0;
			  }
			}
