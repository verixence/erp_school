import { toast as hot } from 'react-hot-toast';

export const toast = {
  success: hot.success,
  error: hot.error,
  loading: hot.loading,
  dismiss: hot.dismiss,
  promise: hot.promise,
  custom: hot.custom,
};

export default toast; 