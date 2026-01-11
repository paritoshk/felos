import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#030712",
                    backgroundImage: "linear-gradient(135deg, #1e3a5f 0%, #030712 50%, #2d1f47 100%)",
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 40,
                    }}
                >
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 16,
                            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 20,
                        }}
                    >
                        <span style={{ color: "white", fontSize: 48, fontWeight: "bold" }}>F</span>
                    </div>
                    <span style={{ color: "white", fontSize: 64, fontWeight: "bold" }}>felos</span>
                    <div
                        style={{
                            marginLeft: 16,
                            padding: "8px 16px",
                            background: "#27272a",
                            borderRadius: 8,
                            color: "#71717a",
                            fontSize: 24,
                        }}
                    >
                        x402
                    </div>
                </div>

                {/* Tagline */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <span style={{ color: "white", fontSize: 36, marginBottom: 16 }}>
                        AI Ad Generation with Micropayments
                    </span>
                    <span style={{ color: "#a1a1aa", fontSize: 28 }}>
                        Create ads for $0.75 instead of $199/month
                    </span>
                </div>

                {/* Stats */}
                <div
                    style={{
                        display: "flex",
                        gap: 60,
                        marginTop: 60,
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ color: "#3b82f6", fontSize: 48, fontWeight: "bold" }}>$0.75</span>
                        <span style={{ color: "#71717a", fontSize: 20 }}>per ad set</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ color: "#22c55e", fontSize: 48, fontWeight: "bold" }}>99.6%</span>
                        <span style={{ color: "#71717a", fontSize: 20 }}>savings</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ color: "white", fontSize: 48, fontWeight: "bold" }}>265</span>
                        <span style={{ color: "#71717a", fontSize: 20 }}>ads/$199</span>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 40,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    <span style={{ color: "#71717a", fontSize: 20 }}>Powered by</span>
                    <span style={{ color: "#3b82f6", fontSize: 20, fontWeight: "bold" }}>Coinbase x402</span>
                    <span style={{ color: "#71717a", fontSize: 20 }}>on</span>
                    <span style={{ color: "#8b5cf6", fontSize: 20, fontWeight: "bold" }}>Base</span>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
