"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
async function main() {
    await mongoose_1.default.connect("mongodb+srv://Achal:Achal123@cluster0.oxmz1w9.mongodb.net/medio");
    const shareSchema = new mongoose_1.default.Schema({
        shareId: { type: String, required: true, unique: true, index: true },
        venue: { type: mongoose_1.default.Schema.Types.Mixed, required: true },
    }, { timestamps: true });
    // No pre-save hook
    const Share = mongoose_1.default.model("ShareTest", shareSchema);
    // This should fail validation since shareId is required but not provided
    try {
        const share = new Share({ venue: { id: "test", lat: 19.0, lon: 72.0, name: "Test" } });
        console.log("BEFORE SAVE - shareId:", share.shareId);
        console.log("BEFORE SAVE - validated:", await share.validate().then(() => "OK").catch(e => e.message));
        await share.save();
        console.log("SAVE SUCCEEDED");
    }
    catch (err) {
        console.log("\n=== ERROR ===");
        console.log("name:", err.name);
        console.log("message:", err.message);
        if (err.errors)
            console.log("errors:", JSON.stringify(err.errors, null, 2));
        console.log("stack:", err.stack);
    }
    await mongoose_1.default.disconnect();
}
main();
//# sourceMappingURL=debug_share.js.map