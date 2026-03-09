import dbConnect from '@/lib/db';
import { CompanySettings } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        let company = await CompanySettings.findOne();
        if (!company) {
            company = await CompanySettings.create({
                name: 'Mi Empresa',
                rif: 'J-00000000-0',
                address: '',
                phone: '',
                email: ''
            });
        }
        return NextResponse.json(company);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    await dbConnect();
    try {
        const body = await req.json();
        let company = await CompanySettings.findOne();
        if (!company) {
            company = await CompanySettings.create(body);
        } else {
            Object.assign(company, body);
            await company.save();
        }
        return NextResponse.json(company);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
