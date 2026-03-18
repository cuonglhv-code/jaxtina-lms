'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateLessonsPage(courseId: string, moduleId: string) {
  revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/lessons`)
}
