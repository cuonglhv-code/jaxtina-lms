'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateModulesPage(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}/modules`)
}
