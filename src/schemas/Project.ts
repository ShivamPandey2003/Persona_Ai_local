import { z } from 'zod'

export const CreateProject = z.object({
    project_type: z.enum(["brand_representative", "consultant"]),
    project_name: z.string().min(4, "Too small: expected title to have >=4 characters").max(50, "Too large: expected title to have <=50 characters"),
    description: z.string().min(4, "Too small: expected description to have >=4 characters").max(50, "Too large: expected description to have <=50 characters"),
})

export type CreateProjectForm = z.infer<typeof CreateProject>

export const UpdateProject = z.object({
    project_name: z.string().min(2, "Too small: expected title to have >=2 characters").max(150, "Too large: expected title to have <=150 characters"),
    description: z.string().max(150, "Too large: expected description to have <=150 characters").optional(),
})

export type UpdateProjectForm = z.infer<typeof UpdateProject>