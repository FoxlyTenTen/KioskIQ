/**
 * TransactionForm Component
 *
 * HITL form that collects transaction details (amount, category, date, description, type)
 * when the user wants to add/update an expense to the database.
 */

import React, { useState, useEffect } from "react";

interface TransactionFormProps {
    args: any;
    respond: any;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ args, respond }) => {
    let parsedArgs = args;
    if (typeof args === "string") {
        try {
            parsedArgs = JSON.parse(args);
        } catch (e) {
            parsedArgs = {};
        }
    }

    // State for form fields
    const [amount, setAmount] = useState<number>(0);
    const [category, setCategory] = useState<string>("Food");
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [name, setName] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [type, setType] = useState<string>("expense");

    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Pre-fill form from orchestrator extraction
    useEffect(() => {
        if (parsedArgs) {
            if (parsedArgs.amount) setAmount(Number(parsedArgs.amount));
            if (parsedArgs.category) setCategory(parsedArgs.category);
            if (parsedArgs.date) setDate(parsedArgs.date);
            if (parsedArgs.description) setName(parsedArgs.description); // Use description as initial name
            if (parsedArgs.type) setType(parsedArgs.type);
        }
    }, [parsedArgs]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!amount || amount <= 0) {
            newErrors.amount = "Please enter a valid positive amount";
        }
        if (!category.trim()) {
            newErrors.category = "Please select a category";
        }
        if (!date) {
            newErrors.date = "Please select a date";
        }
        if (!name.trim()) {
            newErrors.name = "Please enter a transaction name";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) {
            return;
        }

        setSubmitted(true);
        respond?.({
            amount,
            category,
            date,
            name,
            description: notes, // Send notes as description
            type
        });
    };

    if (submitted) {
        return (
            <div className="bg-[#85E0CE]/30 backdrop-blur-md border-2 border-[#85E0CE] rounded-lg p-4 my-3 shadow-elevation-md">
                <div className="flex items-center gap-2">
                    <div className="text-2xl">✓</div>
                    <div>
                        <h3 className="text-base font-semibold text-[#010507]">Transaction Details Submitted</h3>
                        <p className="text-xs text-[#57575B]">
                            Adding {type}: ${amount} for {category} on {date}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const categories = ["Food", "Transport", "Accommodation", "Shopping", "Entertainment", "Bills", "Health", "Other"];
    const types = ["expense", "income"];

    return (
        <div className="bg-[#FFAC4D]/20 backdrop-blur-md border-2 border-[#FFAC4D] rounded-lg p-4 my-3 shadow-elevation-md animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-4">
                <div className="text-2xl">💳</div>
                <div>
                    <h3 className="text-base font-semibold text-[#010507]">Add Transaction</h3>
                    <p className="text-xs text-[#57575B]">Enter details to update your database</p>
                </div>
            </div>

            <div className="space-y-3">
                {/* Type Selection */}
                <div>
                    <label className="block text-xs font-medium text-[#010507] mb-1.5">Type</label>
                    <div className="flex bg-white/60 rounded-lg p-1 border border-[#DBDBE5]">
                        {types.map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${type === t
                                    ? (t === 'expense' ? 'bg-red-100 text-red-700 shadow-sm' : 'bg-green-100 text-green-700 shadow-sm')
                                    : 'text-gray-500 hover:bg-white/50'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Name / Description */}
                <div>
                    <label className="block text-xs font-medium text-[#010507] mb-1.5">Transaction Name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${errors.name
                            ? "border-red-400 bg-red-50"
                            : "border-[#DBDBE5] bg-white/80 focus:border-[#FFAC4D] focus:outline-none"
                            }`}
                        placeholder="e.g., Shopping, Lunch at Joe's"
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-xs font-medium text-[#010507] mb-1.5">Amount ($) *</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${errors.amount
                            ? "border-red-400 bg-red-50"
                            : "border-[#DBDBE5] bg-white/80 focus:border-[#FFAC4D] focus:outline-none"
                            }`}
                        placeholder="0.00"
                    />
                    {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                </div>

                {/* Category */}
                <div>
                    <label className="block text-xs font-medium text-[#010507] mb-1.5">Category *</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border-2 border-[#DBDBE5] bg-white/80 focus:border-[#FFAC4D] focus:outline-none"
                    >
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-xs font-medium text-[#010507] mb-1.5">Date *</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border-2 border-[#DBDBE5] bg-white/80 focus:border-[#FFAC4D] focus:outline-none"
                    />
                    {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
                </div>

                {/* Optional Notes */}
                <div>
                    <label className="block text-xs font-medium text-[#010507] mb-1.5">Notes (Optional)</label>
                    <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border-2 border-[#DBDBE5] bg-white/80 focus:border-[#FFAC4D] focus:outline-none"
                        placeholder="Additional details..."
                    />
                </div>

            </div>

            <div className="mt-4">
                <button
                    onClick={handleSubmit}
                    className="w-full bg-[#E88D35] hover:bg-[#D57F2D] text-white font-semibold py-2.5 px-4 text-sm rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                    Save Transaction
                </button>
            </div>
        </div>
    );
};
