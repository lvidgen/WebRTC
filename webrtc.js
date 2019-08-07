            (function () {
				document.getElementById("mopener").checked=false;
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
				var mediaConnection = null;
				var fp = document.getElementById('fileProgress');
				var receiveBuffer = [];
				var receivedSize = 0;
				var infilename;
				var infilesize;

				

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
                };
					
					function showLogIns(){			
                        logMess.innerHTML+=" Connected to "+theirName+".";
						conDiv.style.display="none";
						document.getElementById("sendarea").style.display="grid";
						document.getElementById("burger").style.display="inline";	
					
					peer.on('call', function( mCon) {
						mediaConnection=mCon;
						answerCall(mCon)						
					});
					
					ready();
					}
					
					
				    function ready() {
                    conn.on('data', function (obj) {
                        switch (obj.tag) {
							case "fileinfo":
                                infilename=obj.filename;
								infilesize=obj.filesize;
								fp.style.display="inline";
								fp.value = 0;
								fp.max = infilesize;
								document.getElementById('fileText').textContent=`Receiving '${infilename}' (0/${infilesize} bytes)`;
								infilemod=Date.now();
                                break;
                             case "file":
								receiveFile(obj.data)
								break;
							 case "msg":
                                addMessage(theirName+": " + obj.data);
                                break;
                        };
                    });
                    conn.on('close', function () {
                        status.innerHTML = "Connection reset<br>Awaiting connection...";
                        conn = null;
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
                        conn.send({tag:"msg", data: msg});
                        addMessage(myName+": " + msg);
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
				case "screen":
				shareScreen();
				break;
				case "menu_vid":
				shareVideo();
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

			//start menu items
			
			//video sharing
			async function shareVideo() {
			  let stream, vid = null;

			  try {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
				mediaConnection = peer.call(theirName, stream);
				showVid();
			  } catch(err) {
				/* handle the error */
			  }
			}
			
			async function answerCall(media) {
			  let stream, vid = null;
			  try {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
				media.answer(stream);
				showVid();
			  } catch(err) {
				console.log(err)
				/* handle the error */
			  }
			}
			
			function showVid(){
				mediaConnection.on('stream', function(peerstream) {
				document.getElementById("vid_wrapper").style.display="block";
				let vid = document.getElementById("vid_canvas");
				vid.srcObject = peerstream;
				});
			}
			
			document.getElementById("file_inp").onchange=function(){
			  fp.style.display="inline";
			  const file = this.files[0];
			  document.getElementById('fileText').textContent=`Sending '${file.name}' (0/${file.size} bytes)`;
			  // Handle 0 size files.
			  //statusMessage.textContent = '';
			  if (file.size === 0) {
				//bitrateDiv.innerHTML = '';
				//statusMessage.textContent = 'File is empty, please select a non-empty file';
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
				message.appendChild(dv);
				lnk.scrollIntoView(false);
				fp.style.display="none";
				receivedSize=0;
			  }
			}
			
		})();