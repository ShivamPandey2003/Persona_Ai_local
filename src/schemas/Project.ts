import { z } from 'zod'

export const CreateProject = z.object({
    role: z.enum(["brand-representative", "consultant"]),
    title: z.string().min(4, "Too small: expected title to have >=4 characters").max(50, "Too large: expected title to have <=50 characters"),
})

export type CreateProjectForm = z.infer<typeof CreateProject>