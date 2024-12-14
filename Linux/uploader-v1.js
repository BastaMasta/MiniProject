var http = require('http');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var { spawn } = require('child_process');

http.createServer(function (req, res) {
  if (req.url == '/fileupload' && req.method.toLowerCase() === 'post') {
    var form = new formidable.IncomingForm({
      uploadDir: '/home/basta/src/MiniProject/Linux/uploads', 
      keepExtensions: true, 
      maxFileSize: 50 * 1024 * 1024, // 50MB
      filter: function({name, originalFilename, mimetype}) {
        // Server-side image type validation
        const allowedMimeTypes = [
          'image/jpeg', 
          'image/png', 
          'image/gif', 
          'image/webp', 
          'image/bmp'
        ];
        return allowedMimeTypes.includes(mimetype);
      }
    });

    form.parse(req, function (err, fields, files) {
      if (err) {
        res.writeHead(500, {'Content-Type': 'text/html'});
        res.end(`
          <!DOCTYPE html>
          <html>  
            <head>
              <title>Upload Error</title>
              <style>${getCSS()}</style>
            </head>
            <body>
              <div class="container error">
                <h1>Upload Failed</h1>
                <p>${err.message}</p>
                <a href="/" class="btn">Try Again</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      const uploadedFile = files.filetoupload || files['filetoupload[]'];
      const customFilename = fields.customFilename[0] || '';
      
      if (!uploadedFile) {
        res.writeHead(400, {'Content-Type': 'text/html'});
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>No File Uploaded</title>
              <style>${getCSS()}</style>
            </head>
            <body>
              <div class="container error">
                <h1>No File Selected</h1>
                <p>Please choose an image file to upload.</p>
                <a href="/" class="btn">Back to Upload</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      const fileToMove = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

      if (!fileToMove.filepath) {
        res.writeHead(400, {'Content-Type': 'text/html'});
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Upload Error</title>
              <style>${getCSS()}</style>
            </head>
            <body>
              <div class="container error">
                <h1>Upload Failed</h1>
                <p>Unable to process the file.</p>
                <a href="/" class="btn">Try Again</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      // Determine the final filename
      const originalExtension = path.extname(fileToMove.originalFilename || '');
      const finalFilename = customFilename 
        ? (customFilename.endsWith(originalExtension) 
          ? customFilename 
          : customFilename + originalExtension)
        : fileToMove.originalFilename;

      const newFilename = path.join('/home/basta/src/MiniProject/Linux/uploads', finalFilename || 'uploadedImage');
      
      fs.rename(fileToMove.filepath, newFilename, function (err) {
        if (err) {
          res.writeHead(500, {'Content-Type': 'text/html'});
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Move Error</title>
                <style>${getCSS()}</style>
              </head>
              <body>
                <div class="container error">
                  <h1>File Move Failed</h1>
                  <p>${err.message}</p>
                  <a href="/" class="btn">Try Again</a>
                </div>
              </body>
            </html>
          `);
          return;
        }

        // Execute Python script after successful file upload
        const pythonProcess = spawn('python', [
          'process-script.py', 
          newFilename  // Pass the full path of the uploaded file to the Python script
        ]);

        // Optional: Handle Python script output
        pythonProcess.stdout.on('data', (data) => {
          console.log(`Python Script Output: ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error(`Python Script Error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
          console.log(`Python script exited with code ${code}`);
        });

        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Upload Success</title>
              <style>${getCSS()}</style>
            </head>
            <body>
              <div class="container success">
                <h1>Upload Successful!</h1>
                <p>Image saved as "${finalFilename}".</p>
                <a href="/" class="btn">Upload Another Image</a>
              </div>
            </body>
          </html>
        `);
      });
    });
  } else {
    // Serve the upload form
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Image Uploader</title>
          <style>${getCSS()}</style>
        </head>
        <body>
          <div class="container">
            <div class="upload-box">
              <h1>E-Paper Display System Image Uploader</h1>
              <form action="/fileupload" method="post" enctype="multipart/form-data">
                <div class="file-input-wrapper">
                  <input type="file" id="fileInput" name="filetoupload" class="file-input" 
                         accept="image/jpeg, image/png, image/gif, image/webp, image/bmp" multiple>
                  <label for="fileInput" class="file-input-label">
                    <span class="file-input-text">Choose Image</span>
                    <span class="file-input-btn">Browse</span>
                  </label>
                </div>
                <div id="file-chosen">No image chosen</div>
                
                <div id="image-preview-container" class="image-preview-container">
                  <img id="image-preview" src="#" alt="Image preview" class="image-preview" style="display:none;">
                </div>

                <div class="custom-filename-wrapper">
                  <label for="customFilename">Custom Filename (optional):</label>
                  <input type="text" id="customFilename" name="customFilename" class="custom-filename-input" placeholder="Enter custom filename">
                  <small>Leave blank to use original filename. Only images allowed.</small>
                </div>
                <button type="submit" class="btn upload-btn" id="upload-btn" disabled>Upload Image</button>
              </form>
            </div>
          </div>
          <script>
            const fileInput = document.getElementById('fileInput');
            const fileChosen = document.getElementById('file-chosen');
            const imagePreview = document.getElementById('image-preview');
            const uploadBtn = document.getElementById('upload-btn');

            fileInput.addEventListener('change', function(){
              const file = this.files[0];
              if(file) {
                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
                if (!allowedTypes.includes(file.type)) {
                  alert('Please select a valid image file (JPEG, PNG, GIF, WebP, BMP)');
                  this.value = ''; // Clear the input
                  fileChosen.textContent = 'No image chosen';
                  imagePreview.style.display = 'none';
                  uploadBtn.disabled = true;
                  return;
                }

                // File name and preview
                fileChosen.textContent = file.name;
                
                // Image preview
                const reader = new FileReader();
                reader.onload = function(e) {
                  imagePreview.src = e.target.result;
                  imagePreview.style.display = 'block';
                }
                reader.readAsDataURL(file);

                // Enable upload button
                uploadBtn.disabled = false;
              } else {
                fileChosen.textContent = 'No image chosen';
                imagePreview.style.display = 'none';
                uploadBtn.disabled = true;
              }
            });
          </script>
        </body>
      </html>
    `);
  }
}).listen(8080, () => {
  console.log('Server running on http://localhost:8080');
});

// getCSS() function remains unchanged from the previous code
function getCSS() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: #f4f4f4;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      line-height: 1.6;
    }
    .container {
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 500px;
      padding: 30px;
      text-align: center;
    }
    .upload-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1 {
      margin-bottom: 20px;
      color: #333;
    }
    .file-input-wrapper {
      position: relative;
      width: 100%;
      margin-bottom: 15px;
    }
    .file-input {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }
    .file-input-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 10px 15px;
      border: 2px dashed #3498db;
      border-radius: 5px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .file-input-label:hover {
      border-color: #2980b9;
    }
    .file-input-text {
      color: #7f8c8d;
    }
    .file-input-btn {
      background-color: #3498db;
      color: white;
      padding: 5px 10px;
      border-radius: 3px;
    }
    #file-chosen {
      margin-bottom: 15px;
      color: #7f8c8d;
    }
    .image-preview-container {
      margin-bottom: 15px;
      max-height: 250px;
      display: flex;
      justify-content: center;
    }
    .image-preview {
      max-width: 100%;
      max-height: 250px;
      object-fit: contain;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .btn {
      display: inline-block;
      background-color: #3498db;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      transition: background-color 0.3s;
      border: none;
      cursor: pointer;
      margin-top: 15px;
    }
    .btn:disabled {
      background-color: #bdc3c7;
      cursor: not-allowed;
    }
    .btn:hover:not(:disabled) {
      background-color: #2980b9;
    }
    .upload-btn {
      width: 100%;
    }
    .custom-filename-wrapper {
      margin-bottom: 15px;
      text-align: left;
    }
    .custom-filename-input {
      width: 100%;
      padding: 10px;
      margin-top: 5px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .custom-filename-wrapper small {
      display: block;
      color: #7f8c8d;
      margin-top: 5px;
      font-size: 0.8em;
    }
  `;
}
