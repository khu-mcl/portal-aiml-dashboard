import React, { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import { FLAPI } from '../../../apis';
import { convertToCommaSeparatedString, getDatalakeNameWithoutConversion } from '../common/CommonMethods';

const FLJobInfo = props => {
  const [fljobName, setFLJobName] = useState('');
  const [description, setDescription] = useState('');
  const [featuregroupName, setFeaturegroupName] = useState('');
  const [pipelineName, setPipelineName] = useState('');
  const [pipelineVersion, setPipelineVersion] = useState('');
  const [experimentName, setExperimentName] = useState('');
  const [argumentsData, setArgumentsData] = useState('');
  const [datalakeSource, setDatalakeSource] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [enableVersioning, setEnableVersioning] = useState(false);
  const [version, setVersion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!props.fljob?.fljob_name) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let flJobName = props.fljob.fljob_name;
        console.log('Fetching FL job data for:', flJobName);

        const response = await FLAPI.getFLJobByName({
          params: { flJobName },
        });

        console.log(`Response for FL job ${flJobName}`, response);

        if (response?.data) {
          const flJobData = response.data[flJobName];
          if (flJobData.pipeline_version === flJobData.pipeline_name) {
            flJobData.pipeline_version = '1';
          }
          setFLJobName(flJobData.fljob_name || '');
          setDescription(flJobData.description || '');
          setFeaturegroupName(flJobData.featuregroup_name || '');
          setPipelineName(flJobData.pipeline_name || '');
          setPipelineVersion(flJobData.pipeline_version || '');
          setExperimentName(flJobData.experiment_name || '');
          setArgumentsData(convertToCommaSeparatedString(flJobData.arguments) || '');
          // setDatalakeSource(getDatalakeNameWithoutConversion(flJobData.datalake_source) || '');
          setDatalakeSource(flJobData.datalake_source || '');
          setModelUrl(flJobData.model_url || '');
          setEnableVersioning(flJobData.enable_versioning || false);
          setVersion(flJobData.version || '');
        } else {
          setError('No data found for the specified FL job');
        }
      } catch (err) {
        console.error('Error fetching FL job:', err);
        setError(err.message || 'Error fetching FL job');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [props.fljob]);

  if (!props.fljob?.fljob_name) {
    return <div>Cannot find FL job name</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Form>
      <Form.Group className="mb-4" controlId='FLJobName'>
        <Form.Label>FL Job Name</Form.Label>
        <Form.Control type='text' value={fljobName} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='FeaturegroupName'>
        <Form.Label>Feature Group Name</Form.Label>
        <Form.Control type='text' value={featuregroupName} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='PipelineName'>
        <Form.Label>Pipeline Name</Form.Label>
        <Form.Control type='text' value={pipelineName} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='PipelineVersion'>
        <Form.Label>Pipeline Version</Form.Label>
        <Form.Control type='text' value={pipelineVersion} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='ExperimentName'>
        <Form.Label>Experiment Name</Form.Label>
        <Form.Control type='text' value={experimentName} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='ArgumentsData'>
        <Form.Label>Hyper Parameters</Form.Label>
        <Form.Control type='text' value={argumentsData} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='DatalakeSource'>
        <Form.Label>Datalake Source</Form.Label>
        <Form.Control type='text' value={datalakeSource} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='ModelUrl'>
        <Form.Label>Model URL</Form.Label>
        <Form.Control type='text' value={modelUrl} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='Version'>
        <Form.Label>Version</Form.Label>
        <Form.Control type='text' value={version} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='EnableVersioning'>
        <Form.Check type='checkbox' label='Enable versioning' checked={enableVersioning} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='Description'>
        <Form.Label>Description</Form.Label>
        <Form.Control type='text' value={description} readOnly />
      </Form.Group>
    </Form>
  );
};

export default FLJobInfo;
