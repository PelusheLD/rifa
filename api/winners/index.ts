import { storage } from '../../server/storage.js';
import jwt from 'jsonwebtoken';
import { NowRequest, NowResponse } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || "rifas_online_secret_jwt";

function authenticateJWT(req: NowRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: NowRequest, res: NowResponse) {
  if (req.method === 'GET') {
    try {
      const winners = await storage.getWinners();
      res.json(winners);
    } catch {
      res.status(500).json({ message: 'Error al obtener ganadores' });
    }
  } else if (req.method === 'POST') {
    if (!authenticateJWT(req)) return res.status(401).json({ message: "Token inválido o expirado" });
    try {
      const { raffleId, winnerName, ticketNumber, prize } = req.body;
      if (!raffleId || !winnerName || !ticketNumber || !prize) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
      }
      const raffle = await storage.getRaffle(raffleId);
      if (!raffle) return res.status(404).json({ message: 'Rifa no encontrada' });
      console.log('Raffle:', raffle);
      console.log('raffle.imageUrl:', raffle.imageUrl);
      console.log('Objeto ganador a insertar:', {
        raffleId,
        winnerName,
        ticketNumber,
        prize,
        announcedDate: new Date(),
        claimed: false,
        prizeImage: raffle.imageUrl
      });
      const newWinner = await storage.createWinner({
        raffleId,
        winnerName,
        ticketNumber,
        prize,
        announcedDate: new Date(),
        claimed: false,
        prizeImage: raffle.imageUrl
      });
      res.status(201).json(newWinner);
    } catch {
      res.status(500).json({ message: 'Error al registrar ganador' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 