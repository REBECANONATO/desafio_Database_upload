import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, In, getCustomRepository } from 'typeorm';
import TransactionsReporitory from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface TransactionCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactions: TransactionCSV[] = [];
    const categories: string[] = [];
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsReporitory);

    const stream = fs
      .createReadStream(filePath)
      .pipe(
        csvParse({
          from_line: 2,
          trim: true,
        }),
      )
      .on('data', row => {
        const [title, type, value, category] = row;
        if (!title || !type || !value) return;
        categories.push(category);
        transactions.push({ title, type, value, category });
      });

    await new Promise(resolve => {
      stream.on('end', resolve);
    });
    let existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      category => category.title,
    );

    const addCategories = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategories.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);
    existentCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: existentCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
