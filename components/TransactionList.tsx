import React from "react";
import { TransactionData } from "./types";

interface TransactionListProps {
    data: TransactionData;
    onDelete?: (id: string) => void;
}

export const TransactionList = ({ data, onDelete }: TransactionListProps) => {

    const totalExpenses = data.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-[#DBDBE5] shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-xl text-[#010507]">Recent Transactions</h3>
                    <p className="text-sm text-[#57575B]">Database Records</p>
                </div>
                <div className="bg-[#E88D35] text-white px-4 py-2 rounded-lg font-bold shadow-sm">
                    Total Expenses: RM {totalExpenses.toFixed(2)}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {data.transactions.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 italic">No transactions found.</div>
                ) : (
                    data.transactions.map((txn) => (
                        <div
                            key={txn.transaction_id}
                            className="bg-white p-4 rounded-lg border border-[#E9E9EF] shadow-sm flex justify-between items-center group hover:border-[#E88D35]/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${txn.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'
                                    }`}>
                                    {txn.type === 'income' ? '💰' : '💸'}
                                </div>
                                <div>
                                    <p className="font-semibold text-[#010507]">{txn.name || txn.description || txn.category}</p>
                                    <div className="flex flex-col text-xs text-[#57575B]">
                                        <div className="flex gap-2">
                                            <span>{txn.date}</span>
                                            <span>•</span>
                                            <span className="capitalize">{txn.category}</span>
                                        </div>
                                        {txn.name && txn.description && txn.description !== txn.name && (
                                            <span className="italic mt-0.5 text-gray-500">{txn.description}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`text-lg font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-[#010507]'
                                    }`}>
                                    {txn.type === 'expense' ? '-' : '+'}RM {txn.amount}
                                </div>
                                {onDelete && (
                                    <button
                                        onClick={() => onDelete(txn.transaction_id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all rounded-full hover:bg-red-50"
                                        title="Delete Transaction"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#DBDBE5] text-xs text-center text-[#838389]">
                Showing {data.count} records from MongoDB
            </div>
        </div>
    );
};
