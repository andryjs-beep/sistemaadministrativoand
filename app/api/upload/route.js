import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

        const timestamp = Math.round(new Date().getTime() / 1000);

        // Generate signature
        const signatureString = `timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('api_key', process.env.CLOUDINARY_API_KEY);
        uploadFormData.append('timestamp', timestamp);
        uploadFormData.append('signature', signature);

        const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: uploadFormData,
        });

        const result = await response.json();

        if (response.ok) {
            return NextResponse.json({ url: result.secure_url }, { status: 200 });
        } else {
            return NextResponse.json({ error: result.error.message }, { status: 400 });
        }

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
