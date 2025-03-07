require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const app = express();
app.use(cors({ origin: "https://resume-roast-three.vercel.app/" })); // Allow frontend access
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

const userUploadTimestamps = new Map();
const UPLOAD_COOLDOWN = 5000; // 5 seconds

app.post("/upload-resume", upload.single("resume"), async (req, res) => {
    try {
        const userIP = req.ip;
        const currentTime = Date.now();

        if (userUploadTimestamps.has(userIP) && currentTime - userUploadTimestamps.get(userIP) < UPLOAD_COOLDOWN) {
            return res.status(429).json({ error: "Bhai, HR bhi itni jaldi resume nahi dekh raha! Thoda rukke try kar!" });
        }
        userUploadTimestamps.set(userIP, currentTime);

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded!" });
        }

        if (req.file.mimetype !== "application/pdf") {
            return res.status(400).json({ error: "Invalid file type! Please upload a PDF." });
        }

        const { language } = req.body;
       
        const pdfData = await pdfParse(req.file.buffer);
        const extractedText = pdfData.text;

        const selectedLanguage = language || "English";

        let roastPrompt = `Bro, absolutely DESTROY this resume in ${selectedLanguage}. No corporate nonsense—just pure, meme-level roasting like two best friends clowning each other.  
        - Be brutally funny, sarcastic, and engaging.  
        - Roast everything line by line.  
        - Use simple, everyday ${selectedLanguage}. No fancy words—just pure savage humor.  
        - Make fun of achievements like they’re participation trophies.  
        - Add emojis to make it hit harder.  
        - Keep it short, punchy, and straight to the point.  
        - Give an ATS score and roast the resume.  
        **Here's the resume:** \n\n${extractedText}  
        - Roast brutally but in the end give rating in a funny way of the resume in one line.`;

        if (selectedLanguage.toLowerCase() === "hindi") {
            roastPrompt = `Bhai, is resume ki aisi taisi kar do, ekdum full tandoori roast chahiye!🔥  
            - Har ek line pe solid taunt maaro.  
            - Achi tarah se lagane wala sarcasm use karo.  
            - Achi achievement ko bhi aise udaao jaise kisi ne gully cricket jeeta ho. 🏏🤣  
            - Emojis aur memes ka proper use ho, taki roast aur mast lage. 💀😂  
            - Chhota, mazedaar aur full tandoor level ka roast chahiye.  
            - ATS score bhi do, lekin aise jaise school me ma'am ne aakhri bench wale ko bola ho - "Beta, next time better karo!" 😆  
            **Yeh raha resume:** \n\n${extractedText}  
            - Aur last me, ek savage tareeke se rating dedo jaise kisi dost ko dete hain - "Bhai, ye resume dekh ke HR bhi soch raha hoga ki kaise mana kare bina hasaaye!"`;
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/llama-3.3-70b-instruct:free",
                messages: [
                    {
                        "role": "user",
                        "content": roastPrompt
                    },
                ],
                top_p: 1,
                temperature: 1,
                repetition_penalty: 1
            }),
        });

        if (!response.ok) {
            return res.status(500).json({ error: "Failed to call OpenRouter AI API" });
        }

        const data = await response.json();
        res.json({ roast: data.choices[0].message.content });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Failed to roast resume!" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
