let receiveBuffer = [];
let receivedSize = 0;
var infilename;
var infiletype;
var infilemod;
var infilesize;
const downloadAnchor = document.getElementById('receivedlink');

document.getElementById("file_inp").onchange=function(){
	const sendProgress = document.getElementById('sendProgress');
	
  const file = this.files[0];
  console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);

  // Handle 0 size files.
  //statusMessage.textContent = '';
  downloadAnchor.textContent = '';
  if (file.size === 0) {
    //bitrateDiv.innerHTML = '';
    //statusMessage.textContent = 'File is empty, please select a non-empty file';
    return;
  }
  sendProgress.max = file.size;
  conn.send({tag:"fileinfo", filetype: file.type, filename:file.name, infilesize: file.size})
  const chunkSize = 16384;
  fileReader = new FileReader();
  let offset = 0;
  fileReader.addEventListener('error', error => console.error('Error reading file:', error));
  fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
  fileReader.addEventListener('load', e => {
    console.log('FileRead.onload ', e);
    conn.send({tag:"file", data: e.target.result});
    offset += e.target.result.byteLength;
    sendProgress.value = offset;
    if (offset < file.size) {
      readSlice(offset);
    }
  });
  const readSlice = o => {
    console.log('readSlice ', o);
    const slice = file.slice(offset, o + chunkSize);
    fileReader.readAsArrayBuffer(slice);
  };
  readSlice(0);
}

function onReceiveMessageCallback(event) {
  console.log(`Received Message ${event.data.byteLength}`);
  receiveBuffer.push(event.data);
  receivedSize += event.data.byteLength;
  document.getElementById('receiveProgress').value = receivedSize;
  if (receivedSize === infilesize) {
    const received = new Blob(receiveBuffer);
    receiveBuffer = [];

    downloadAnchor.href = URL.createObjectURL(received);
    downloadAnchor.download = infilename;
    downloadAnchor.textContent =
      `Click to download '${infilename}' (${infilesize} bytes)`;
    downloadAnchor.style.display = 'block';

  }
}