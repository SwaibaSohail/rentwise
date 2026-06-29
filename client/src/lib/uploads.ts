import { api } from "./api";

export const uploadsApi = {
  image: (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.post<{ url: string }>("/api/uploads", fd).then((r) => r.data);
  },
};
