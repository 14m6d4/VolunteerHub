
import axios from 'axios';
import FormData from 'form-data';

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

/**
 * Uploads a file buffer to ImgBB and returns the direct image URL.
 * @param buffer The file content as a Buffer.
 * @param filename The name of the file (optional, but good for metadata).
 * @returns The direct URL of the uploaded image.
 */
export async function uploadToImgBB(buffer: Buffer, filename: string): Promise<string> {
    try {
        if (!IMGBB_API_KEY) {
            throw new Error('IMGBB_API_KEY is not configured in .env');
        }

        // Convert buffer to base64 because ImgBB API supports base64 directly, 
        // or we can use FormData with buffer. 
        // ImgBB docs say `image` parameter: "The binary file, base64 data, or a URL for an image."
        // Using base64 is often more reliable with axios without needing extensive FormData headers tweak.
        // Let's use base64 string.

        const base64Image = buffer.toString('base64');

        const form = new FormData();
        form.append('image', base64Image);
        // Optional: form.append('name', filename);

        console.log(`[ImgBB] Uploading ${filename}...`);

        const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 30000,
        });

        const data = response.data;

        if (data && data.success && data.data && data.data.url) {
            console.log(`[ImgBB] Upload successful. URL: ${data.data.url}`);
            return data.data.url;
        } else {
            console.error('[ImgBB] Unexpected response structure:', data);
            throw new Error('ImgBB upload failed: Invalid response structure');
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('[ImgBB] Network Error:', error.message);
            if (error.response) {
                console.error('[ImgBB] Response Status:', error.response.status);
                console.error('[ImgBB] Response Data:', error.response.data);
            }
        } else {
            console.error('[ImgBB] Error:', error);
        }
        throw new Error('Failed to upload to ImgBB');
    }
}
