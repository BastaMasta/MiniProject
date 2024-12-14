import sys
import os
from PIL import Image
import numpy as np

display_size = (480, 800)

def process_uploaded_file(file_path):
    """
    Process the uploaded file with correct path handling
    """
    try:
        # Ensure the file path uses forward slashes and is absolute
        file_path = file_path.replace('\\', '/')

        # Basic file information logging
        print(f"Full uploaded file path: {file_path}")
        print(f"File name: {os.path.basename(file_path)}")
        print(f"File size: {os.path.getsize(file_path)} bytes")

        # Open the image using the full path
        img = Image.open(file_path)

        # Example processing - you can replace this with your specific logic
        print(f"Image size: {img.size}")
        print(f"Image format: {img.format}")
        print(f"Image mode: {img.mode}")

        print("beginning Image processing...")
        if img.format == "PNG":
            img = img.convert("RGB")

        ary = np.array(img)

        # Split the three channels
        r, g, b = np.split(ary, 3, axis=2)
        r = r.reshape(-1)
        g = r.reshape(-1)
        b = r.reshape(-1)

        # Standard RGB to grayscale
        bitmap = list(map(lambda x: 0.299 * x[0] + 0.587 * x[1] + 0.114 * x[2],
                          zip(r, g, b)))
        bitmap = np.array(bitmap).reshape([ary.shape[0], ary.shape[1]])
        bitmap = np.dot((bitmap > 128).astype(float), 255)
        im = Image.fromarray(bitmap.astype(np.uint8))

        print(f"Successfully converted image file into bitmap")

        resized_img = im.resize(display_size, Image.LANCZOS)

        print("Succesfully resized image")

        resized_img.save(f'processed/{os.path.basename(file_path).split('.')[0]}.bmp')

        print(f"Successfully saved image as {os.path.basename(file_path).split('.')[0]}.bmp")

        # Additional processing can go here
        # For example:
        # - Resize image
        # - Convert image format
        # - Apply filters
        # - Generate thumbnails

    except Exception as e:
        print(f"Error processing file: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Check if file path is provided as an argument
    if len(sys.argv) < 2:
        print("No file path provided")
        sys.exit(1)

    file_path = sys.argv[1]
    process_uploaded_file(file_path)