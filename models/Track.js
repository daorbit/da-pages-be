import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  author: {
    type: String,
    trim: true,
    maxlength: [100, 'Author cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  duration: {
    type: String,
    trim: true
  },
  listeners: {
    type: String,
    default: '0',
    trim: true
  },
  date: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot be more than 50 characters']
  },
  audioUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for better query performance
trackSchema.index({ category: 1 });
trackSchema.index({ author: 1 });
trackSchema.index({ createdAt: -1 });

const Track = mongoose.model('Track', trackSchema);

export default Track;