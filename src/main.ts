import * as core from '@actions/core'
import { readFileSync } from 'fs'
import { glob } from 'glob'
import { validatePolicySet } from './validate'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const schemaFile: string = core.getInput('schema-file')

    const schemaString = readFileSync(schemaFile, 'utf-8')

    const schema = JSON.parse(schemaString)

    const policyFiles = await glob('**/*.cedar')

    let hasErrors = false

    for (const policyFile of policyFiles) {
      const policySet = readFileSync(policyFile, 'utf-8')
      const result = validatePolicySet({
        schema,
        policySet
      })

      if (result.schemaErrors.length > 0) {
        const allErrors: string[] = []

        for (const err of result.schemaErrors) {
          core.error(err, {
            file: schemaFile,
            title: 'Cedar Schema Error',
            startLine: 1
          })
          allErrors.push(err)
        }

        throw new Error(`Cedar schema is invalid:\n${allErrors.join('\n')}`)
      }

      for (const err of result.validationErrors) {
        core.error(err.error, {
          file: policyFile,
          startColumn: err.sourceLocation?.start.col,
          startLine: err.sourceLocation?.start.line,
          endColumn: err.sourceLocation?.end.col,
          endLine: err.sourceLocation?.end.line,
          title: 'Cedar Validation Error'
        })
        hasErrors = true
      }

      for (const err of result.validationWarnings) {
        core.warning(err.warning, {
          file: policyFile,
          startColumn: err.sourceLocation?.start.col,
          startLine: err.sourceLocation?.start.line,
          endColumn: err.sourceLocation?.end.col,
          endLine: err.sourceLocation?.end.line,
          title: 'Cedar Validation Error'
        })
      }

      if (hasErrors) {
        core.setFailed('Cedar policies have validation errors')
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
