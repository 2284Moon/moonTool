"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Lock, Unlock, Search } from "lucide-react";
import CryptoJS from "crypto-js";

type CryptoMethod =
    | "MD5"
    | "SHA1"
    | "SHA256"
    | "SHA512"
    | "AES"
    | "DES"
    | "TripleDES"
    | "Rabbit"
    | "RC4";

export function CryptoTool() {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [method, setMethod] = useState<CryptoMethod>("MD5");
    const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
    const [secretKey, setSecretKey] = useState("");
    const [salt, setSalt] = useState("");
    const [error, setError] = useState("");
    const [rainbowResult, setRainbowResult] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const needsKey = ["AES", "DES", "TripleDES", "Rabbit", "RC4"].includes(method);
    const hashMethods = ["MD5", "SHA1", "SHA256", "SHA512"];
    const isHashMethod = hashMethods.includes(method);
    const supportsRainbow = ["MD5", "SHA1"].includes(method);

    const handleProcess = () => {
        if (!input.trim()) {
            setError("请输入要处理的文本");
            return;
        }

        if (needsKey && !secretKey.trim()) {
            setError("此加密方法需要密钥");
            return;
        }

        try {
            let result = "";
            const textToHash = salt ? input + salt : input;

            if (mode === "encrypt") {
                switch (method) {
                    case "MD5":
                        result = CryptoJS.MD5(textToHash).toString();
                        break;
                    case "SHA1":
                        result = CryptoJS.SHA1(textToHash).toString();
                        break;
                    case "SHA256":
                        result = CryptoJS.SHA256(textToHash).toString();
                        break;
                    case "SHA512":
                        result = CryptoJS.SHA512(textToHash).toString();
                        break;
                    case "AES":
                        result = CryptoJS.AES.encrypt(input, secretKey).toString();
                        break;
                    case "DES":
                        result = CryptoJS.DES.encrypt(input, secretKey).toString();
                        break;
                    case "TripleDES":
                        result = CryptoJS.TripleDES.encrypt(input, secretKey).toString();
                        break;
                    case "Rabbit":
                        result = CryptoJS.Rabbit.encrypt(input, secretKey).toString();
                        break;
                    case "RC4":
                        result = CryptoJS.RC4.encrypt(input, secretKey).toString();
                        break;
                }
            } else {
                switch (method) {
                    case "AES":
                        const aesBytes = CryptoJS.AES.decrypt(input, secretKey);
                        result = aesBytes.toString(CryptoJS.enc.Utf8);
                        break;
                    case "DES":
                        const desBytes = CryptoJS.DES.decrypt(input, secretKey);
                        result = desBytes.toString(CryptoJS.enc.Utf8);
                        break;
                    case "TripleDES":
                        const tripleDesBytes = CryptoJS.TripleDES.decrypt(input, secretKey);
                        result = tripleDesBytes.toString(CryptoJS.enc.Utf8);
                        break;
                    case "Rabbit":
                        const rabbitBytes = CryptoJS.Rabbit.decrypt(input, secretKey);
                        result = rabbitBytes.toString(CryptoJS.enc.Utf8);
                        break;
                    case "RC4":
                        const rc4Bytes = CryptoJS.RC4.decrypt(input, secretKey);
                        result = rc4Bytes.toString(CryptoJS.enc.Utf8);
                        break;
                }
            }

            if (!result) {
                setError("解密失败，请检查密钥是否正确");
                return;
            }

            setOutput(result);
            setError("");
            setRainbowResult("");
        } catch (e) {
            setError("处理失败：" + (e as Error).message);
        }
    };

    const handleRainbowLookup = async () => {
        if (!input.trim()) {
            setError("请输入哈希值");
            return;
        }

        setIsSearching(true);
        setRainbowResult("");
        setError("");

        try {
            const response = await fetch(`https://md5decrypt.net/en/Api/api.php?hash=${input}&hash_type=${method.toLowerCase()}&email=deanna_abshire@gmail.com&code=1be9c13e4d`);
            const text = await response.text();

            if (text && text !== "NOT_FOUND" && !text.includes("ERROR")) {
                setRainbowResult(text);
                setOutput(text);
                setError("");
            } else {
                setRainbowResult("");
                setError("未在彩虹表中找到对应的原文（可能是加了盐或不是常见密码）");
            }
        } catch (e) {
            setError("彩虹表查询失败：" + (e as Error).message);
        } finally {
            setIsSearching(false);
        }
    };

    const generateSalt = () => {
        const randomSalt = Math.random().toString(36).substring(2, 15);
        setSalt(randomSalt);
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            setError("复制失败");
        }
    };

    const handleClear = () => {
        setInput("");
        setOutput("");
        setError("");
        setRainbowResult("");
    };

    const cryptoMethods: { value: CryptoMethod; label: string; desc: string }[] = [
        { value: "MD5", label: "MD5", desc: "128位哈希（不可逆）" },
        { value: "SHA1", label: "SHA-1", desc: "160位哈希（不可逆）" },
        { value: "SHA256", label: "SHA-256", desc: "256位哈希（不可逆）" },
        { value: "SHA512", label: "SHA-512", desc: "512位哈希（不可逆）" },
        { value: "AES", label: "AES", desc: "高级加密标准（可逆）" },
        { value: "DES", label: "DES", desc: "数据加密标准（可逆）" },
        { value: "TripleDES", label: "3DES", desc: "三重DES加密（可逆）" },
        { value: "Rabbit", label: "Rabbit", desc: "流加密算法（可逆）" },
        { value: "RC4", label: "RC4", desc: "流加密算法（可逆）" },
    ];

    return (
        <div className="w-full space-y-4">
            <Card className="overflow-hidden border-2 py-0">
                <div className="border-b bg-muted/50 px-4 py-2">
                    <h2 className="text-sm font-semibold text-foreground">🔐 加密方法</h2>
                    <p className="text-xs text-muted-foreground">选择加密或哈希算法</p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3 lg:grid-cols-5">
                    {cryptoMethods.map((m) => (
                        <button
                            key={m.value}
                            onClick={() => {
                                setMethod(m.value);
                                setOutput("");
                                setError("");
                                setRainbowResult("");
                                if (hashMethods.includes(m.value)) {
                                    setMode("encrypt");
                                }
                            }}
                            className={`flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all hover:border-primary/50 ${method === m.value
                                    ? "border-primary bg-primary/5"
                                    : "border-border bg-background"
                                }`}
                        >
                            <span className="text-sm font-semibold">{m.label}</span>
                            <span className="text-xs text-muted-foreground">{m.desc}</span>
                        </button>
                    ))}
                </div>
            </Card>

            {!isHashMethod && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant={mode === "encrypt" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            setMode("encrypt");
                            setOutput("");
                            setError("");
                        }}
                    >
                        <Lock className="h-4 w-4" />
                        加密
                    </Button>
                    <Button
                        variant={mode === "decrypt" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            setMode("decrypt");
                            setOutput("");
                            setError("");
                        }}
                    >
                        <Unlock className="h-4 w-4" />
                        解密
                    </Button>
                </div>
            )}

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                    <strong>错误：</strong> {error}
                </div>
            )}

            {rainbowResult && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                    <strong>✓ 彩虹表查询成功：</strong> {rainbowResult}
                </div>
            )}

            {isHashMethod && (
                <Card className="overflow-hidden border-2 border-dashed border-purple-500/30 py-0">
                    <div className="border-b bg-muted/50 px-4 py-2">
                        <h2 className="text-sm font-semibold text-foreground">🧂 加盐（Salt）</h2>
                        <p className="text-xs text-muted-foreground">
                            添加盐值可以防止彩虹表攻击（原文+盐值一起哈希）
                        </p>
                    </div>
                    <div className="flex gap-2 p-4">
                        <Input
                            value={salt}
                            onChange={(e) => setSalt(e.target.value)}
                            placeholder="输入盐值（可选）..."
                            className="flex-1 font-mono"
                        />
                        <Button variant="outline" size="sm" onClick={generateSalt}>
                            随机生成
                        </Button>
                    </div>
                </Card>
            )}

            {needsKey && (
                <Card className="overflow-hidden border-2 border-dashed border-yellow-500/30 py-0">
                    <div className="border-b bg-muted/50 px-4 py-2">
                        <h2 className="text-sm font-semibold text-foreground">🔑 密钥</h2>
                        <p className="text-xs text-muted-foreground">
                            {mode === "encrypt" ? "设置加密密钥（请妥善保管）" : "输入解密密钥"}
                        </p>
                    </div>
                    <div className="p-4">
                        <Input
                            type="password"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            placeholder="输入密钥..."
                            className="font-mono"
                        />
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="flex flex-col overflow-hidden border-2 border-dashed border-blue-500/30 bg-card py-0 transition-colors hover:border-blue-500/50">
                    <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">
                                📝 {mode === "encrypt" ? "原始文本" : "加密文本"}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {mode === "encrypt" ? "输入需要加密的文本" : "输入需要解密的文本"}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => copyToClipboard(input)}
                            disabled={!input}
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            mode === "encrypt"
                                ? "在此输入需要加密的文本..."
                                : "在此粘贴需要解密的密文..."
                        }
                        className="h-[300px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                        spellCheck={false}
                    />
                </Card>

                <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0 transition-colors hover:border-green-500/50">
                    <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">
                                ✨ {mode === "encrypt" ? "加密结果" : "解密结果"}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {mode === "encrypt" ? "加密后的密文" : "解密后的原文"}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => copyToClipboard(output)}
                            disabled={!output}
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <textarea
                        value={output}
                        readOnly
                        placeholder={
                            mode === "encrypt"
                                ? "加密结果将显示在这里..."
                                : "解密结果将显示在这里..."
                        }
                        className="h-[300px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                        spellCheck={false}
                    />
                </Card>
            </div>

            <div className="flex items-center justify-center gap-3">
                <Button onClick={handleProcess} size="lg" className="min-w-32">
                    {mode === "encrypt" ? (
                        <>
                            <Lock className="h-4 w-4" />
                            {isHashMethod ? "生成哈希" : "加密"}
                        </>
                    ) : (
                        <>
                            <Unlock className="h-4 w-4" />
                            解密
                        </>
                    )}
                </Button>

                {supportsRainbow && (
                    <Button
                        onClick={handleRainbowLookup}
                        size="lg"
                        variant="outline"
                        disabled={isSearching || !input.trim()}
                    >
                        <Search className="h-4 w-4" />
                        {isSearching ? "查询中..." : "彩虹表查询"}
                    </Button>
                )}

                <Button onClick={handleClear} size="lg" variant="outline">
                    清空
                </Button>
            </div>

            <Card className="overflow-hidden border py-0">
                <div className="border-b bg-muted/50 px-4 py-2">
                    <h2 className="text-sm font-semibold text-foreground">💡 使用说明</h2>
                </div>
                <div className="space-y-2 p-4 text-xs text-muted-foreground">
                    <p>
                        <strong>哈希算法（MD5、SHA系列）：</strong>
                        单向加密，不可逆。相同输入永远产生相同输出（确定性），但无法从哈希值反推原文。
                    </p>
                    <p>
                        <strong>加盐（Salt）：</strong>
                        在原文后添加随机字符串再哈希，可以防止彩虹表攻击。例如：hash("123456" + "abc123")
                    </p>
                    <p>
                        <strong>彩虹表查询：</strong>
                        通过预先计算的哈希对照表查找常见密码，仅支持MD5和SHA-1。加了盐的哈希无法查询。
                    </p>
                    <p>
                        <strong>对称加密（AES、DES等）：</strong>
                        可逆加密，需要密钥，加密和解密使用相同密钥
                    </p>
                    <p>
                        <strong>安全提示：</strong>
                        请勿在生产环境中使用弱加密算法（如DES、MD5），推荐使用AES-256或SHA-256+盐值
                    </p>
                </div>
            </Card>
        </div>
    );
}
