"use client";

import { useState } from "react";

interface AdGenerationFormProps {
    onSubmit: (data: AdFormData) => void;
    isGenerating: boolean;
}

export interface AdFormData {
    productUrl: string;
    productName: string;
    productDescription: string;
    targetAudience: string;
    adTone: "urgent" | "playful" | "premium" | "all";
    generateImages: boolean;
}

const EXAMPLE_PRODUCTS = [
    { name: "Sony WH-1000XM5", url: "https://amazon.com/dp/B09XS7JWHH" },
    { name: "Apple AirPods Pro", url: "https://amazon.com/dp/B0D1XD1ZV3" },
    { name: "Dyson V15 Detect", url: "https://amazon.com/dp/B09MVGV8RD" },
];

export function AdGenerationForm({ onSubmit, isGenerating }: AdGenerationFormProps) {
    const [formData, setFormData] = useState<AdFormData>({
        productUrl: "",
        productName: "",
        productDescription: "",
        targetAudience: "general",
        adTone: "all",
        generateImages: true,
    });
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productUrl && !formData.productName) {
            alert("Please enter a product URL or name");
            return;
        }
        onSubmit(formData);
    };

    const handleQuickStart = (url: string, name: string) => {
        setFormData({ ...formData, productUrl: url, productName: name });
    };

    const estimatedCost =
        0.01 + // scrape
        0.02 + // ad copy
        (formData.generateImages ? 0.04 : 0); // image

    return (
        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white">Generate Ads</h2>
                    <p className="text-xs text-zinc-400">AI-powered ad creation with x402</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product URL */}
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Product URL
                    </label>
                    <input
                        type="url"
                        placeholder="https://amazon.com/dp/..."
                        value={formData.productUrl}
                        onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                {/* Quick Start Examples */}
                <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-zinc-500">Try:</span>
                    {EXAMPLE_PRODUCTS.map((product) => (
                        <button
                            key={product.name}
                            type="button"
                            onClick={() => handleQuickStart(product.url, product.name)}
                            className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                        >
                            {product.name}
                        </button>
                    ))}
                </div>

                {/* Or enter manually */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-zinc-900 text-zinc-500">or describe your product</span>
                    </div>
                </div>

                {/* Product Name */}
                <div>
                    <input
                        type="text"
                        placeholder="Product name (e.g., Premium Coffee Subscription)"
                        value={formData.productName}
                        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                {/* Ad Tone Selection */}
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Ad Tone
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { value: "all", label: "All 3" },
                            { value: "urgent", label: "Urgent" },
                            { value: "playful", label: "Playful" },
                            { value: "premium", label: "Premium" },
                        ].map((tone) => (
                            <button
                                key={tone.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, adTone: tone.value as AdFormData["adTone"] })}
                                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                    formData.adTone === tone.value
                                        ? "bg-blue-600 border-blue-500 text-white"
                                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                                }`}
                            >
                                {tone.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate Images Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div>
                        <span className="text-sm text-zinc-300">Generate Ad Images</span>
                        <span className="text-xs text-zinc-500 ml-2">(+$0.04)</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, generateImages: !formData.generateImages })}
                        className={`w-12 h-6 rounded-full transition-colors ${
                            formData.generateImages ? "bg-blue-600" : "bg-zinc-700"
                        }`}
                    >
                        <div
                            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                formData.generateImages ? "translate-x-6" : "translate-x-0.5"
                            }`}
                        />
                    </button>
                </div>

                {/* Advanced Options */}
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                >
                    {showAdvanced ? "Hide" : "Show"} advanced options
                </button>

                {showAdvanced && (
                    <div className="space-y-3 pt-2">
                        <textarea
                            placeholder="Product description (optional - we'll scrape it from the URL)"
                            value={formData.productDescription}
                            onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                        <select
                            value={formData.targetAudience}
                            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            <option value="general">General Audience</option>
                            <option value="young-adults">Young Adults (18-35)</option>
                            <option value="professionals">Business Professionals</option>
                            <option value="parents">Parents & Families</option>
                            <option value="tech-savvy">Tech Enthusiasts</option>
                        </select>
                    </div>
                )}

                {/* Cost Preview */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-800/50">
                    <div>
                        <span className="text-sm text-zinc-300">Estimated Cost</span>
                        <div className="text-xs text-zinc-500">via x402 micropayments</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-mono font-bold text-white">${estimatedCost.toFixed(2)}</div>
                        <div className="text-xs text-green-400">vs $199/mo subscription</div>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-zinc-700 disabled:to-zinc-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Generating...
                        </span>
                    ) : (
                        "Generate Ads"
                    )}
                </button>
            </form>
        </div>
    );
}
