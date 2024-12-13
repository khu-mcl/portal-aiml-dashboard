import { fl_instance } from '../states';

export const FLAPI = {
  getAllGlobal: async () => {
    return await fl_instance.get('/global');
  },
  getGlobalByName: async ({ params }) => {
    return await fl_instance.get(`/global/${params.globalName}`);
  },
  createGlobalModel: async ({ data }) => {
    return await fl_instance.post('/global/create', { ...data });
  },
  getFLJobByName: async ({ params }) => {
    return await fl_instance.get(`/fljobs/${params.flJobName}`);
  },
  invokeFLJob: async ({ params, data }) => {
    return await fl_instance.post(`/fljobs/${params.flJobName}`, { ...data });
  },
  startTraining: async ({ params }) => {
    return await fl_instance.post(`/fljobs/${params.flJobName}/training`);
  },
};
