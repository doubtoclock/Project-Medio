export const registerUser = async (data: any) => {
  return {
    id: 1,
    ...data
  };
};

export const loginUser = async (data: any) => {
  return {
    token: "fake-jwt-token"
  };
};
