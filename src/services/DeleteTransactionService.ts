import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const deleteResult = await transactionRepository.delete(id);
    if (!deleteResult.affected) {
      throw new AppError('Não foi possível deletar a transação, ID inválido');
    }
  }
}

export default DeleteTransactionService;
