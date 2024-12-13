import React, { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import { FLMgr_baseUrl } from '../../../states';
import { FLAPI } from '../../../apis';

const GlobalInfo = props => {
  const [global, setGlobalName] = useState('');
  const [totalClients, setTotalClients] = useState('');
  const [totalRounds, setTotalRounds] = useState('');
  const [pipelineList, setPipelineList] = useState([]);
  const [pipelineVersionList, setPipelineVersionList] = useState([]);
  const [clientPipelines, setClientPipelines] = useState({});
  const [clientNames, setClientNames] = useState([]);
  const [datalakeSourceName, setDatalakeSourceName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!props.global?.global_name) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      console.log('props.global.global_name', props);

      try {
        let globalName = props.global.global_name;
        console.log('global_name', globalName);
        const response = await FLAPI.getGlobalByName({
          params: { globalName },
        });

        console.log(
          `response for ${FLMgr_baseUrl}/global/${globalName}`,
          response
        );

        if (response?.data) {
          const globalData = response.data;
          setGlobalName(globalData.global_name || '');
          setTotalClients(globalData.total_clients || '');
          setTotalRounds(globalData.total_rounds || '');
          setDatalakeSourceName(globalData.datalake_source || '');
          setHost(globalData.host || '');
          setPort(globalData.port || '');
          setDescription(globalData.description || '');
        } else {
          setError('No data found');
        }
      } catch (err) {
        console.error('Error fetching global job:', err);
        setError(err.message || 'Error fetching global job');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [props.global]);

  if (!props.global?.global_name) {
    return <div>Cannot find global model name</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Form>
      <Form.Group className="mb-4" controlId='GlobalName'>
        <Form.Label>Global Model Name</Form.Label>
        <Form.Control type='text' value={global} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='totalClients'>
        <Form.Label>Total Clients</Form.Label>
        <Form.Control type='text' value={totalClients} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='totalRounds'>
        <Form.Label>Total Rounds</Form.Label>
        <Form.Control type='text' value={totalRounds} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='datalakeSourceName'>
        <Form.Label>Datalake Source Name</Form.Label>
        <Form.Control type='text' value={datalakeSourceName} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='host'>
        <Form.Label>Host</Form.Label>
        <Form.Control type='text' value={host} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='port'>
        <Form.Label>Port</Form.Label>
        <Form.Control type='text' value={port} readOnly />
      </Form.Group>
      <Form.Group className="mb-4" controlId='description'>
        <Form.Label>Description</Form.Label>
        <Form.Control type='text' value={description} readOnly />
      </Form.Group>
    </Form>
  );
};

export default GlobalInfo;