import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
    _id: mongoose.Types.ObjectId,
    name: string,
    email: string,
    movie_id: mongoose.Types.ObjectId,
    text: string,
    date: Date
}

const CommentSchema: Schema = new Schema<IComment>(
    {
        name: {
            type: String,
            required: true,
        }
        ,
        email: {
            type: String,
            required: [true, 'Please provide an email'],
            trim: true,
            lowercase: true,
            match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
        },
        movie_id: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        text: {
            type: String,
            required: [true, 'Please provide a comment text'],
        },
        date: {
            type: Date,
            default: Date.now,
        }
    },
    {
        timestamps: true
    }
);

const Comment = mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;