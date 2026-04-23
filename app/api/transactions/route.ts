import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Note: using simple random ID if uuid not available, but 'uuid' is not in package.json
// I'll use crypto.randomUUID if available or a simple generator.

function generateId() {
    return 'txn_' + Math.random().toString(36).substr(2, 9);
}

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("financial_system");

        // Sort by date desc, then created_at desc
        const transactions = await db.collection("transactions")
            .find({})
            .sort({ date: -1, created_at: -1 })
            .toArray();

        const formatted = transactions.map(t => {
            const d = new Date(t.date);
            const friendlyDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            let friendlyCreated = undefined;
            if (t.created_at) {
                const c = new Date(t.created_at);
                friendlyCreated = c.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            }

            return {
                ...t,
                _id: t._id.toString(),
                amount: Number(t.amount),
                date: friendlyDate, // "28 Jan 2026"
                created_at: friendlyCreated // "28 Jan 2026"
            };
        });

        // Calculate total
        const total_amount = formatted.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        return NextResponse.json({
            status: "success",
            transactions: formatted,
            total_amount,
            count: formatted.length
        });
    } catch (e) {
        return NextResponse.json({ status: "error", message: String(e) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, category, date, name, description, type } = body;

        if (!amount || !name) {
            return NextResponse.json({ status: "error", message: "Missing required fields" }, { status: 400 });
        }

        const validCategories = ["Food", "Transport", "Accommodation", "Shopping", "Entertainment", "Bills", "Health", "Other", "Groceries", "Travel"]; // Expanded list

        const txnCategory = category || 'Groceries';

        if (!validCategories.includes(txnCategory) && !validCategories.includes("Other")) {
            // Fallback or allow dynamic categories? Let's just allow what's passed if we want flexibility, 
            // but strictly matching the list:
            // actually, let's make it permissive for the demo to avoid frustration.
        }

        const client = await clientPromise;
        const db = client.db("financial_system");

        const newTxn = {
            transaction_id: generateId(),
            user_id: 'demo_user',
            amount: Number(amount),
            category: txnCategory,
            date: date ? new Date(date) : new Date(),
            name,
            description: description || '',
            type: type || 'expense',
            created_at: new Date()
        };

        await db.collection("transactions").insertOne(newTxn);

        return NextResponse.json({ status: "success", transaction: newTxn });
    } catch (e) {
        return NextResponse.json({ status: "error", message: String(e) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        // Expect transaction_id in query or body
        const url = new URL(req.url);
        const transaction_id = url.searchParams.get("transaction_id");

        if (!transaction_id) {
            return NextResponse.json({ status: "error", message: "Missing transaction_id" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("financial_system");

        const result = await db.collection("transactions").deleteOne({ transaction_id });

        if (result.deletedCount === 1) {
            return NextResponse.json({ status: "success" });
        } else {
            return NextResponse.json({ status: "error", message: "Transaction not found" }, { status: 404 });
        }
    } catch (e) {
        return NextResponse.json({ status: "error", message: String(e) }, { status: 500 });
    }
}
