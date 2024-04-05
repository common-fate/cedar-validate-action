import * as core from '@actions/core'
import chalk from 'chalk'
import { readFileSync } from 'fs'
import { glob } from 'glob'
import { ValidateOutput, validatePolicySet } from './validate'

interface TestResult {
  file: string
  result: ValidateOutput
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    chalk.level = 2 // enable colored output for GitHub Actions

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
    let hasWarnings = false

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

    const filesWithIssues: TestResult[] = []

    for (const policyFile of policyFiles) {
      const policySet = readFileSync(policyFile, 'utf-8')
      const result = validatePolicySet({
        schema,
        policySet,
        ignoreConfusableIdentifierWarning: core.getBooleanInput(
          'ignore-confusable-identifier-warning'
        )
      })

      if (result.validationErrors.length > 0) {
        core.info(`${policyFile} ... FAIL`)
      } else if (result.validationWarnings.length > 0) {
        core.info(`${policyFile} ... warn`)
      } else {
        core.info(`${policyFile} ... ok`)
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

      if (
        result.validationErrors.length > 0 ||
        result.schemaErrors.length > 0
      ) {
        filesWithIssues.push({
          file: policyFile,
          result
        })
      }
    }

    if (filesWithIssues.length > 0) {
      core.info('\nissues:\n')
    }

    for (const result of filesWithIssues) {
      core.info(`---- ${result.file} ----`)

      for (const err of result.result.validationErrors) {
        core.info(`[ERROR] ${err.policyId}: ${err.error}`)

        core.error(err.error, {
          file: result.file,
          startColumn: err.sourceLocation?.start.col,
          startLine: err.sourceLocation?.start.line,
          endColumn: err.sourceLocation?.end.col,
          endLine: err.sourceLocation?.end.line,
          title: 'Cedar Validation Error'
        })
        hasErrors = true
      }

      for (const err of result.result.validationWarnings) {
        core.info(`[WARNING] ${err.policyId}: ${err.warning}`)

        core.warning(err.warning, {
          file: result.file,
          startColumn: err.sourceLocation?.start.col,
          startLine: err.sourceLocation?.start.line,
          endColumn: err.sourceLocation?.end.col,
          endLine: err.sourceLocation?.end.line,
          title: 'Cedar Validation Warning'
        })
        hasWarnings = true
      }
    }

    if (hasErrors) {
      core.setFailed('Cedar policies have validation errors')
      return
    }

    if (hasWarnings && core.getBooleanInput('fail-on-warnings')) {
      core.setFailed(`Cedar policies have validation warnings`)
      core.info(
        "if you'd like to mark the action as succeeded despite warnings, you can set 'fail-on-warnings' to false"
      )
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
