const mongoose = require('mongoose')

const productSchema = mongoose.Schema(
    {
        Teamname: {
            type:String,
            required: [true, "Please enter a Team name"]
        },
        ConfRecord: {
            type: String, 
            required: [true, "Please enter Conference Record"]
        },
        WinPercent: {
            type: String, 
            required: [true, "Please enter a Percentage"]
        },
        Overall: {
            type: String, 
            required: [true, "Please enter a Overall Record"]
        },
        image: {
            type: String,
            required: false
        },
        questions: {
            type: String,
            required: true,
        },
        answer: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true
    }
)

const Product = mongoose.model('Product', productSchema)

module.exports = Product