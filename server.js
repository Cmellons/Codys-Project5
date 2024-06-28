const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/userModels');
const Product = require('./models/productModel');
const Question = require('./models/questionModel')
const session = require('express-session');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Note: Set to true if using HTTPS
}));

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    const username = req.session.user.username;
    res.sendFile(path.join(__dirname, 'dashboard.html'), { username });
});
// Get Username for dashboard
app.get('/api/username', isAuthenticated, (req, res) => {
    const username = req.session.user.username;
    res.json({ username });
});
app.get('/data', isAuthenticated, async (req, res) => {
    try {
        const data = await Product.find({});
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }
        const user = new User({ username, password });
        await user.save();
        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid username or password' });
        }
        req.session.user = user;
        res.status(200).json({ success: true, message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true, message: 'Logout successful' });
    });
});
// Questions
app.post('/create_question', isAuthenticated, async (req, res) => {
    const { question } = req.body;
    if (!question || !question.endsWith('?')) {
        return res.status(400).json({ success: false, message: 'Question must not be empty and must end with a question mark.' });
    }
    try {
        const newQuestion = new Question({
            content: question,
            createdBy: req.session.user._id // Assuming user ID is stored in session
        });
        await newQuestion.save();
        res.status(201).json({ success: true, message: 'Question created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/questions', isAuthenticated, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Number of questions per page
    try {
        const questions = await Question.find({})
            .skip((page - 1) * limit)
            .limit(limit);
        const totalQuestions = await Question.countDocuments({});
        res.status(200).json({
            questions,
            hasMore: totalQuestions > page * limit
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/generate_answers', isAuthenticated, async (req, res) => {
    try {
        const questions = await Question.find({});
        const products = await Product.find({});

        const answers = questions.map(question => {
            let answer = [];
            const content = question.content.toLowerCase();

            products.forEach(product => {
                const teamname = product.Teamname.toLowerCase();
                const confrecord = product.ConfRecord.toLowerCase();
                const winpercent = product.WinPercent.toLowerCase();
                const overall = product.Overall.toLowerCase();

                if (content.includes('confrecord') && content.includes(product.ConfRecord.split('Wins')[0].toLowerCase() + 'wins')) {
                    answer.push(product.Teamname);
                } else if (content.includes('winpercent') && content.includes(product.WinPercent)) {
                    answer.push(product.Teamname);
                } else if (content.includes('overall') && content.includes(product.Overall)) {
                    answer.push(product.Teamname);
                } else if (content.includes(teamname)) {
                    answer.push(`TeamName: ${product.Teamname}, ConfRecord: ${product.ConfRecord}, WinPercent: ${product.WinPercent}, Overall: ${product.Overall}`);
                } else {
                    // Check for number of wins or losses
                    const winsMatch = content.match(/(\d+)wins/);
                    const lossesMatch = content.match(/(\d+)losses/);
                    if (winsMatch && confrecord.includes(`${winsMatch[1]}wins`)) {
                        answer.push(product.Teamname);
                    }
                    if (lossesMatch && confrecord.includes(`${lossesMatch[1]}losses`)) {
                        answer.push(product.Teamname);
                    }
                }
            });

            return {
                question: question.content,
                answer: answer.length > 0 ? answer.join(', ') : "No matching data found",
                createdBy: question.createdBy
            };
        });

        res.status(200).json({ success: true, answers: answers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
app.post('/get_answer', isAuthenticated, async (req, res) => {
    try {
        const { team_name, question } = req.body;
        const team = await Product.findOne({ Teamname: team_name });

        if (!team) {
            return res.json({ error: 'Team not found' });
        }

        let answer;
        switch (question) {
            case 'conf_record':
                answer = team.ConfRecord;
                break;
            case 'win_percent':
                answer = team.WinPercent;
                break;
            case 'overall_record':
                answer = team.Overall;
                break;
            default:
                answer = 'Invalid question';
        }

        res.json({ answer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.listen(4000, () => {
    console.log(`Node API app is running on port 4000`);
});

mongoose.set('strictQuery', false);
mongoose
    .connect('mongodb+srv://admin:Cokess123@codym.pntvyaj.mongodb.net/?retryWrites=true&w=majority&appName=CodyM')
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(3000, () => {
            console.log(`Node API app is running on port 4000`);
        });
    })
    .catch((error) => {
        console.log(error);
    });
