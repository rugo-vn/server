/* eslint-disable */

export const name = 'sample';

export const actions = {
  gate({ auth }) {
    return auth;
  },

  find({ auth, query, table, bar }) {
    return {
      bar,
      auth,
      query,
      table,
    };
  }
}