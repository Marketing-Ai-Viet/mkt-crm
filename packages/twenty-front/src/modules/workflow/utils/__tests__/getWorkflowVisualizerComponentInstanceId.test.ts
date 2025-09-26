import { getWorkflowVisualizerComponentInstanceId } from '../getWorkflowVisualizerComponentInstanceId';

describe('getWorkflowVisualizerComponentInstanceId', () => {
  it('should return the same recordId that was passed in', () => {
    const recordId = 'test-record-id-123';

    const result = getWorkflowVisualizerComponentInstanceId({ recordId });

    expect(result).toBe(recordId);
  });

  it('should return empty string when recordId is empty', () => {
    const recordId = '';

    const result = getWorkflowVisualizerComponentInstanceId({ recordId });

    expect(result).toBe('');
  });

  it('should handle UUID format recordIds', () => {
    const recordId = 'd55a0f7d-9d5b-4c8e-ae7a-ba4b5e49701c';

    const result = getWorkflowVisualizerComponentInstanceId({ recordId });

    expect(result).toBe(recordId);
  });

  it('should handle special characters in recordId', () => {
    const recordId = 'test-record-id_with.special@chars';

    const result = getWorkflowVisualizerComponentInstanceId({ recordId });

    expect(result).toBe(recordId);
  });
});
