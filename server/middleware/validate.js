import { body, validationResult } from 'express-validator';

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

export const validateCreateBet = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('category').isIn(['golf', 'fitness', 'food', 'games', 'promises', 'other']).withMessage('Invalid category'),
  body('wagerAmount').isFloat({ min: 0.01 }).withMessage('Wager must be greater than 0'),
  body('opponentId').trim().notEmpty().withMessage('Opponent is required'),
  body('refereeId').optional({ values: 'falsy' }),
  body('deadline').notEmpty().withMessage('Deadline is required'),
  handleValidationErrors,
];

export const validateComment = [
  body('text').trim().notEmpty().withMessage('Comment text is required'),
  handleValidationErrors,
];

export const validateJoinSide = [
  body('side').isIn(['for', 'against']).withMessage('Side must be "for" or "against"'),
  handleValidationErrors,
];

export const validateSettle = [
  body('winningSide').isIn(['for', 'against']).withMessage('Winner must be "for" or "against"'),
  handleValidationErrors,
];
