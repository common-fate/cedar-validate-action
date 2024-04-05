import * as core from '@actions/core'
import chalk from 'chalk'
import { readFileSync } from 'fs'
import { glob } from 'glob'
import { validatePolicySet } from './validate'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const schemaFilePattern: string = core.getInput('schema-file')

    const schemaMatches = await glob(schemaFilePattern)

    if (schemaMatches.length === 0) {
      throw new Error(
        `could not find a Cedar schema file (looked for ${schemaFilePattern})`
      )
    }

    const schemaFile = schemaMatches[0]

    const schemaString = readFileSync(schemaFile, 'utf-8')

    const schema = JSON.parse(schemaString)

    const policyFiles = await glob('**/*.cedar')

    let hasErrors = false

    if (policyFiles.length === 0) {
      // fail the action as this is a misconfiguration, we shouldn't pass if there are no policies to test
      throw new Error(
        `could not find any Cedar policies to validate (looked for ${policyFiles})`
      )
    }

    if (policyFiles.length > 1) {
      core.info(
        `Validating ${policyFiles.length} Cedar policies using schema ${schemaFile}...`
      )
    } else {
      core.info(`Validating 1 Cedar policy using schema ${schemaFile}...`)
    }

    for (const policyFile of policyFiles) {
      const policySet = readFileSync(policyFile, 'utf-8')
      const result = validatePolicySet({
        schema,
        policySet
      })

      if (result.validationErrors.length > 0) {
        console.log(`${chalk.red('✗')} ${chalk.dim(policyFile)}`)
      } else if (result.validationWarnings.length > 0) {
        console.log(
          `${chalk.green('✔')} ${chalk.dim(policyFile)} ${chalk.yellow('[has warnings]')}`
        )
      } else {
        console.log(`${chalk.green('✔')} ${chalk.dim(policyFile)}`)
      }

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
