export const API_UNAVAILABLE_MESSAGE = 'Не удалось получить данные. Проверьте доступность API Яндекс Расписаний.';

export class MissingApiKeyError extends Error {
  constructor() {
    super(API_UNAVAILABLE_MESSAGE);
    this.name = 'MissingApiKeyError';
  }
}
