
import axios from 'axios';
import FormData from 'form-data';

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

export async function uploadToImgBB(buffer: Buffer, filename: string): Promise<string> {
    try {
        if (!IMGBB_API_KEY) {
            throw new Error('IMGBB_API_KEY is not configured in .env');
        }


        const base64Image = buffer.toString('base64');

        const form = new FormData();
        form.append('image', base64Image);

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
