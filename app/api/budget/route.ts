import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { month, year, budget, category_limits } = body;

        // Basic validation
        if (!month || !year || !budget) {
            return NextResponse.json(
                { status: 'error', message: 'Missing required fields: month, year, budget' },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db('financial_system');

        // We update if exists, or insert new.
        const query = { month, year };
        const update = {
            $set: {
                month,
                year,
                budget: Number(budget),
                category_limits, // Object like { groceries: 500, entertainment: 200 ... }
                updated_at: new Date()
            }
        };
        const options = { upsert: true };

        const result = await db.collection('monthly_budget').updateOne(query, update, options);

        return NextResponse.json({
            status: 'success',
            message: 'Budget saved successfully',
            data: result
        });

    } catch (e: any) {
        console.error('Failed to save budget:', e);
        return NextResponse.json(
            { status: 'error', message: e.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
