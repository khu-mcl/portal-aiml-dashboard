import React from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import './CreateFederatedLearningForm.css';
import {
  getDatalakeNameWithoutConversion,
  convertDatalakeDBName,
} from '../home/common/CommonMethods';
import { instance, fl_instance, FLMgr_baseUrl } from '../../states';
import { FLAPI, featureGroupAPI, pipelineAPI } from '../../apis';

class CreateFederatedLearningForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      globalModelName: '',
      totalClients: '',
      totalRounds: '',
      pipelineList: [],
      pipelineVersionList: [],
      clientPipelines: {},
      clientNames: [],
      featureGroupName: '',
      featureGroupList: [],
      datalakeSourceList: ['Influx DB'],
      datalakeSourceName: '',
      hyperParameters: '',
      description: '',
      enableVersioning: false,
    };

    this.regName = new RegExp('\\W+');
    this.maxClients = 100;
    this.logger = this.props.logger;
  }

  componentDidMount() {
    const task = () => {
      this.fetchPipelines();
      this.fetchFeatureGroups();
    }
    if (!this.props.isCreateFederatedLearningForm){
      task();
    } else {
      task();
    }
  }

  fetchPipelines() {
    pipelineAPI.getPipelines()
      .then(res => {
        this.logger('Server responded Pipelines', res.data.pipelines);
        this.setState({
          pipelineList: res.data.pipelines,
        }, () => {
          this.logger('PipelineList', this.state.pipelineList);
        });
      })
      .catch(error => {
        this.logger('Got some error' + error);
      });
  }

  fetchPipelineVersions(pipeline_name, clientIndex) {
    pipelineAPI.getPipelineVersions({
        params: {
          pipelineName: pipeline_name
        }
      })
      .then(res => {
        this.logger('Server responded PipelineVersions', res.data.versions_list);
        const versionsList = res.data.versions_list || [];
        this.setState(prevState => ({
          clientPipelines: {
            ...prevState.clientPipelines,
            [clientIndex]: {
              ...prevState.clientPipelines[clientIndex],
              versions: versionsList,
              version: this.getLatestVersion(versionsList)
            }
          }
        }));
      })
      .catch(error => {
        this.logger('Got some error fetching pipeline versions: ' + error);
      });
  }

  getLatestVersion(versions) {
    if (!versions || versions.length === 0) return '';

    let latest = '';
    for (let version of versions) {
      if (isNaN(parseInt(version))) {
        if (latest === '') {
          latest = version;
        }
      } else {
        if (latest === '' || isNaN(parseInt(latest))) {
          latest = version;
        } else {
          if (parseInt(latest) < parseInt(version)) {
            latest = version;
          }
        }
      }
    }
    return latest;
  }

  fetchFeatureGroups() {
    featureGroupAPI.getAllFeatureGroup()
      .then(res => {
        this.logger('Server responded FG', res.data.featuregroups);
        this.setState({
          featureGroupList: res.data.featuregroups,
        });
      })
      .catch(error => {
        this.logger('Got some error' + error);
      });
  }

  handleCreateSubmit = async (event) => {
    let hyperParametersDict = this.buildHyperParametersDict(this.state.hyperParameters);
    let convertedDatalakeDBName = convertDatalakeDBName(this.state.datalakeSourceName);
    event.preventDefault();

    try {
      await FLAPI.createGlobalModel({
        data: {
          global_name: this.state.globalModelName,
          total_clients: this.state.totalClients,
          total_rounds: this.state.totalRounds,
          description: this.state.description,
          datalake_source: convertedDatalakeDBName,
          enable_versioning: this.state.enableVersioning,
        },
      });

      const promises = this.state.clientNames.map((clientName, index) => {
        const clientPipeline = this.state.clientPipelines[index];
        console.log(`Form submitted ${clientName}`, {
          globalModelName: this.state.globalModelName,
          totalClients: this.state.totalClients,
          totalRounds: this.state.totalRounds,
          clientPipeline: clientPipeline,
          featureGroupName: this.state.featureGroupName,
          datalakeSourceName: this.state.datalakeSourceName,
          hyperParameters: hyperParametersDict,
          description: this.state.description,
          clientName: clientName,
          enable_versioning: this.state.enableVersioning,
        });

        return this.invokeCreateFederatedLearning(clientName, clientPipeline);
      });

      await Promise.all(promises);

      alert("FL Job created and training initiated");
      this.resetFrom();
      this.props.fetchGlobals();
      this.props.onHideCreatePopup();
    } catch (error) {
      alert("Training failed: " + (error.response?.data?.Exception || error.message));
      this.props.onHideCreatePopup();
    }

    event.preventDefault();
  };

  async invokeCreateFederatedLearning(clientName, clientPipeline) {
    let hyperParametersDict = this.buildHyperParametersDict(this.state.hyperParameters);
    let convertedDatalakeDBName = convertDatalakeDBName(this.state.datalakeSourceName);

    let FLRequest = {
      global_name: this.state.globalModelName,
      pipeline_name: clientPipeline.pipeline,
      pipeline_version: clientPipeline.version,
      featuregroup_name: this.state.featureGroupName,
      arguments: hyperParametersDict,
      description: this.state.description,
      datalake_source: convertedDatalakeDBName,
      enable_versioning: this.state.enableVersioning,
    };

    console.log("FLRequest", FLRequest);

    return FLAPI.invokeFLJob({
      params: { flJobName: clientName },
      data: FLRequest,
    })
      .then((res) => {
        this.logger("Server responded FL", res.data);
        return this.invokeStartTrainingForCreate(clientName);
      })
      .catch((error) => {
        this.logger("Got some error" + error);
        throw error;
      });
  }

  invokeStartTrainingForCreate(clientName) {
    this.logger("Training called");

    return FLAPI.startTraining({
      params: { flJobName: clientName },
    })
      .then((res) => {
        this.logger("Training response", res);
        if (res.status === 200) {
          return true;
        } else {
          throw new Error("Training failed with status " + res.status);
        }
      })
      .catch((error) => {
        this.logger("Error in training API, response", error.response?.data);
        throw error;
      });
  }

  handleGlobalModelNameChange = event => {
    if (this.regName.test(event.target.value)) {
      event.preventDefault();
      alert('Please use alphabet, number, and underscore for Global Model Name.');
    } else {
      const globalModelName = event.target.value;
      const totalClients = parseInt(this.state.totalClients) || 0;
      const clientNames = Array.from({ length: totalClients }, (_, i) =>
        `${globalModelName}_${i + 1}`
      );

      this.setState({
        globalModelName: globalModelName,
        clientNames: clientNames,
      }, () => {
        this.logger('Updated client names:', this.state.clientNames);
      });
    }
  };

  handleClientsChange = (event) => {
    let value = parseInt(event.target.value);
    if (value > this.maxClients) {
      value = this.maxClients;
    }

    const totalClients = value;
    const newClientPipelines = {};

    const clientNames = Array.from({ length: totalClients }, (_, i) =>
      `${this.state.globalModelName}_${i + 1}`
    );

    for (let i = 0; i < totalClients; i++) {
      newClientPipelines[i] = { pipeline: '', version: '' };
    }

    this.setState({
      totalClients: value,
      clientPipelines: newClientPipelines,
      clientNames: clientNames
    }, () => {
      this.logger('Updated client names:', this.state.clientNames);
    });
  };

  handleRoundsChange = event => {
    const value = event.target.value;
    if (!isNaN(value) || value === '') {
      this.setState({ totalRounds: value });
    }
  };

  handlePipelineChange = (event, clientIndex) => {
    const pipeline = event.target.value;
    this.setState(prevState => ({
      clientPipelines: {
        ...prevState.clientPipelines,
        [clientIndex]: {
          ...prevState.clientPipelines[clientIndex],
          pipeline: pipeline,
          version: ''
        }
      }
    }), () => {
      if (pipeline) {
        this.fetchPipelineVersions(pipeline, clientIndex);
      }
    });
  };

  handlePipelineVersionChange = (event, clientIndex) => {
    const version = event.target.value;
    this.setState(prevState => ({
      clientPipelines: {
        ...prevState.clientPipelines,
        [clientIndex]: {
          ...prevState.clientPipelines[clientIndex],
          version: version
        }
      }
    }));
  };

  handleFeatureGroupNameChange = event => {
    this.setState({ featureGroupName: event.target.value });
  };

  handleDatalakeSourceChange = event => {
    this.setState({ datalakeSourceName: event.target.value });
  };

  buildHyperParametersDict(hyperParameters) {
    if (!hyperParameters) return {};

    let hyperPrametersList = String(hyperParameters).split(',');
    let hyperParametersDict = {};
    for (let hyperParameter of hyperPrametersList) {
      let token = hyperParameter.split(':');
      let key = token[0].trim();
      let value = token[1].trim();

      hyperParametersDict[key] = value;
    }
    return hyperParametersDict;
  }

  renderTrainingFunctionSelectors() {
    const selectors = [];
    const totalClients = parseInt(this.state.totalClients) || 0;

    for (let i = 0; i < totalClients; i++) {
      const clientPipeline = this.state.clientPipelines[i] || {};
      const clientName = this.state.clientNames[i] || `Client ${i + 1}`;

      selectors.push(
        <div key={`client-${i}`} className="mb-4" style={{ border: '1px solid #ccc', borderRadius: '10px', padding: '10px' }}>
          <h5 className="mb-2">{clientName}</h5>
          <Form.Group className="mb-2" controlId={`pipeline-${i}`}>
            <Form.Label>Training Function*</Form.Label>
            <Form.Control
              as="select"
              required
              value={clientPipeline.pipeline || ''}
              onChange={(e) => this.handlePipelineChange(e, i)}
            >
              <option value="" disabled>--- Select Training Function ---</option>
              {this.state.pipelineList.map(data => (
                <option key={data.display_name} value={data.display_name}>
                  {data.display_name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          {clientPipeline.pipeline && (
            <Form.Group className="mb-2" controlId={`pipeline-version-${i}`}>
              <Form.Label>Training Function Version*</Form.Label>
              <Form.Control
                as="select"
                required
                value={clientPipeline.version || ''}
                onChange={(e) => this.handlePipelineVersionChange(e, i)}
              >
                <option value="" disabled>--- Select Version ---</option>
                {(clientPipeline.versions || []).map(version => (
                  <option key={version} value={version}>
                    {version === clientPipeline.pipeline ? '1' : version}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
          )}
        </div>
      );
    }

    return selectors;
  }

  handleHyperParametersChange = event => {
    this.setState({ hyperParameters: event.target.value });
  };

  handleDescriptionChange = event => {
    this.setState({ description: event.target.value });
  };

  handleVersioningChange = event => {
    this.setState(
      {
        enableVersioning: event.target.checked,
      },
      () => {
        this.logger('after set state, enableVersioning: ', this.state.enableVersioning);
      },
    );
  };

  resetFrom = () => {
    this.setState({
      globalModelName: '',
      totalClients: '',
      totalRounds: '',
      featureGroupName: '',
      datalakeSourceName: '',
      hyperParameters: '',
      description: '',
      enableVersioning: false,
    });
  };

  render() {
    return (
      <Form className="create-form" onSubmit={this.handleCreateSubmit}>
        <Form.Group className="mb-4" controlId="globalModelName">
          <Form.Label>Global Model Name*</Form.Label>
          <Form.Control
            type="input"
            value={this.state.globalModelName}
            onChange={this.handleGlobalModelNameChange}
            placeholder="Global model name"
            required
          />
        </Form.Group>

        <Form.Group className="mb-4" controlId="totalClients">
          <Form.Label>Clients*</Form.Label>
          <Form.Control
            type="number"
            value={this.state.totalClients}
            onChange={this.handleClientsChange}
            placeholder="Number of clients"
            required
            min="1"
          />
          <Form.Text className="text-muted">
            Please enter a value between 1 and {this.maxClients}.
          </Form.Text>
        </Form.Group>

        {this.renderTrainingFunctionSelectors()}

        <Form.Group className="mb-4" controlId="totalRounds">
          <Form.Label>Rounds*</Form.Label>
          <Form.Control
            type="number"
            value={this.state.totalRounds}
            onChange={this.handleRoundsChange}
            placeholder="Number of rounds"
            required
            min="1"
          />
        </Form.Group>

        <Form.Group className="mb-4" controlId="featureGroupName">
          <Form.Label>FeatureGroup Name*</Form.Label>
          <Form.Control
            as="select"
            required
            value={this.state.featureGroupName}
            onChange={this.handleFeatureGroupNameChange}
          >
            <option value="" disabled>--- Select FeatureGroup Name ---</option>
            {this.state.featureGroupList.map(data => (
              <option key={data.featuregroup_name} value={data.featuregroup_name}>
                {data.featuregroup_name}
              </option>
            ))}
          </Form.Control>
        </Form.Group>

        <Form.Group className="mb-4" controlId="datalakeSource">
          <Form.Label>Datalake Source*</Form.Label>
          <Form.Control
            as="select"
            required
            value={this.state.datalakeSourceName}
            onChange={this.handleDatalakeSourceChange}
          >
            <option value="" disabled>--- Select Datalake Source ---</option>
            {this.state.datalakeSourceList.map(data => (
              <option key={data} value={data}>
                {data}
              </option>
            ))}
          </Form.Control>
        </Form.Group>
        <Form.Group className="mb-4" controlId="hyperParameters">

        <Form.Label>Hyper Parameters</Form.Label>
          <Form.Control
            as="input"
            value={this.state.hyperParameters}
            onChange={this.handleHyperParametersChange}
            placeholder="key1:value1, key2:value2, ..."
          />
          <Form.Text className="text-muted">
            Enter parameters in format: key:value
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-4" id='EnableVersioning'>
            <Form.Check
              type='checkbox'
              label='Enable versioning'
              checked={this.state.enableVersioning}
              onChange={this.handleVersioningChange}
            />
          </Form.Group>

        <Form.Group className="mb-4" controlId="description">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={this.state.description}
            onChange={this.handleDescriptionChange}
            placeholder="Enter description"
          />
        </Form.Group>

        <Button type="submit">Create Training Job</Button>
      </Form>
    );
  }
}

export default CreateFederatedLearningForm;