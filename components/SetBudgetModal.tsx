"use client";

import { useState } from 'react';

interface SetBudgetModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

export function SetBudgetModal({ onClose, onSuccess }: SetBudgetModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        month: new Date().getMonth() + 1, // 1-12
        year: new Date().getFullYear(),
        budget: '',
        groceries: '',
        entertainment: '',
        travel: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                month: Number(formData.month),
                year: Number(formData.year),
                budget: Number(formData.budget),
                category_limits: {
                    groceries: Number(formData.groceries) || 0,
                    entertainment: Number(formData.entertainment) || 0,
                    travel: Number(formData.travel) || 0
                }
            };

            const res = await fetch('/api/budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.status === 'success') {
                alert('Budget set successfully!');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                alert('Failed to set budget: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold mb-4 text-[#010507]">Set Monthly Budget</h3>
                <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Month</label>
                            <select
                                value={formData.month}
                                onChange={e => setFormData({ ...formData, month: Number(e.target.value) })}
                                className="w-full mt-1 p-2 border rounded-lg bg-white"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Year</label>
                            <input
                                type="number"
                                value={formData.year}
                                onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                                className="w-full mt-1 p-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Total Monthly Budget (RM)</label>
                        <input
                            type="number"
                            value={formData.budget}
                            onChange={e => setFormData({ ...formData, budget: e.target.value })}
                            className="w-full mt-1 p-2 border rounded-lg"
                            placeholder="e.g. 5000"
                            required
                        />
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Category Limits (Optional)</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600">Groceries (RM)</label>
                                <input
                                    type="number"
                                    value={formData.groceries}
                                    onChange={e => setFormData({ ...formData, groceries: e.target.value })}
                                    className="w-full mt-1 p-2 border rounded-lg"
                                    placeholder="Limit for groceries"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600">Entertainment (RM)</label>
                                <input
                                    type="number"
                                    value={formData.entertainment}
                                    onChange={e => setFormData({ ...formData, entertainment: e.target.value })}
                                    className="w-full mt-1 p-2 border rounded-lg"
                                    placeholder="Limit for entertainment"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600">Travel (RM)</label>
                                <input
                                    type="number"
                                    value={formData.travel}
                                    onChange={e => setFormData({ ...formData, travel: e.target.value })}
                                    className="w-full mt-1 p-2 border rounded-lg"
                                    placeholder="Limit for travel"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-[#1B936F] text-white rounded-lg hover:bg-[#157a5b] font-medium disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Budget'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
