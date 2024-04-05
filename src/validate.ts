import { ValidationCall, validate } from '@common-fate/cedar-node'
import { LineColumn, LineColumnFinder } from './line-column-from-index'

interface ValidationError {
  policyId: string
  sourceLocation: SourceLocation | undefined
  error: string
}

interface SourceLocation {
  start: LineColumn
  end: LineColumn
}

interface ValidationWarning {
  policyId: string
  sourceLocation: SourceLocation | undefined
  warning: string
}

export interface ValidateOutput {
  schemaErrors: string[]
  validationErrors: ValidationError[]
  validationWarnings: ValidationWarning[]
}

/**
 * Validates a Cedar PolicySet. Returns warnings that are mapped to Line/Column locations
 * so that they can be used in the GitHub Action for annotations.
 */
export const validatePolicySet = (input: ValidationCall): ValidateOutput => {
  const result = validate(input)
  const finder = new LineColumnFinder(input.policySet)

  const validationErrors = result.validationErrors.map(e => {
    let sourceLocation: SourceLocation | undefined = undefined

    if (e.sourceLocation != null) {
      sourceLocation = {
        start: finder.index(e.sourceLocation.start),
        end: finder.index(e.sourceLocation.end)
      }
    }

    return { ...e, sourceLocation }
  })

  const validationWarnings = result.validationWarnings.map(e => {
    let sourceLocation: SourceLocation | undefined = undefined

    if (e.sourceLocation != null) {
      sourceLocation = {
        start: finder.index(e.sourceLocation.start),
        end: finder.index(e.sourceLocation.end)
      }
    }

    return { ...e, sourceLocation }
  })

  return {
    schemaErrors: result.schemaErrors,
    validationErrors,
    validationWarnings
  }
}
