import React, { useMemo, useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import BTable from 'react-bootstrap/Table';
import { useTable, useExpanded, useRowSelect } from 'react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { Checkbox, Popup, StepsState } from '../../components';
import GlobalInfo from './GlobalInfo';
import FLJobInfo from './FLJobInfo';
import { FLMgr_baseUrl } from '../../states';
import { FLAPI } from '../../apis';

import { deleteFederatedLearnings } from '../home/status/API_STATUS';
import CreateFederatedLearning from './CreateFederatedLearning';

const FederatedLearning = props => {
  const logger = props.logger;
  const [createPopup, setCreatePopup] = useState(false);
  const closeCreatePopup = () => setCreatePopup(false);
  const closeGlobalInfoPopup = () => setGlobalInfoPopup(false);
  const closeFLJobInfoPopup = () => setFLJobInfoPopup(false);
  const [globals, setGlobals] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [globalInfoPopup, setGlobalInfoPopup] = useState(false);
  const [flJobInfoPopup, setFLJobInfoPopup] = useState(false);
  const [stepsStatePopup, setStepsStatePopup] = useState(false);
  const closeStepsStatePopup = () => setStepsStatePopup(false);
  const [stepsStateFLJobNameAndVersion, setStepsStateFLJobNameAndVersion] = useState(null);
  const [globalInfo, setGlobalInfo] = useState(null);
  const [flJobInfo, setFLJobInfo] = useState(null);

  useEffect(() => {
    logger('useEffect');
    fetchGlobals();
    const timer = setInterval(async () => {
      fetchGlobals();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchGlobals = async () => {
    logger('fetchGlobals FLMgr_baseUrl', FLMgr_baseUrl);
    try {
      const result = await FLAPI.getAllGlobal();
      logger('fetchGlobals Result', result);
      const jobsWithLocalData = await Promise.all(
        result.data.global_models.map(async job => {
          return await fetchFLJobs(job);
        })
      );

      setGlobals(jobsWithLocalData);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFLJobs = async (job) => {
    const FLJobs = await Promise.all(
      Array.from({ length: job.total_clients }, async (_, index) => {
        const FLJobName = `${job.global_name}_${index + 1}`;
        // const global_url = `http://${FLJobName}.federated-learning:5000/get_status`;
        const global_url = `http://localhost:5000/get_status`;

        try {
          let fljobs_response = await FLAPI.getFLJobByName({
            params: { flJobName: FLJobName }
          });
          let fljobs_data = fljobs_response.data;

          // console.log(`Status for ${FLJobName}:`, fljobs_data);

          // const global_response = await fetch(global_url);
          // const global_status = await global_response.json();
          // console.log(`Status for ${FLJobName}:`, global_status);
          return {
            global_name: job.global_name,
            fljob_name: FLJobName,
            total_clients: `${job.total_clients}`,
            // total_rounds: `${global_status.current_round}/${job.total_rounds}`,
            total_rounds: `${job.total_rounds}/${job.total_rounds}`,
            status: data.status,
            version: job.version,
          };
        } catch (e) {
          console.error(e);
          return {
            status: 'Error'
          };
        }
      })
    );

    return {
      ...job,
      FLJobs
    };
  };

  const handleCreate = event => {
    setCreatePopup(true);
  };

  const handleDelete = async event => {
    console.log('handleDelete starts..');
    if (selectedFlatRows.length > 0) {
      let deleteFLList = [];
      for (const row of selectedFlatRows) {
        let flDict = {};
        flDict['global_name'] = row.original.global_name;
        flDict['version'] = row.original.version;
        deleteFLList.push(flDict);
      }
      console.log('Selected federated learning for deletion : ', deleteFLList);
      try {
        await deleteFederatedLearnings(deleteFLList);
        await fetchGlobals();
      } catch (error) {
        console.log(error);
      }
      toggleAllRowsSelected(false);
    } else {
      alert('Please select at least one');
    }
  };

  const handleGlobalInfoClick = (global_name) => {
    setGlobalInfo({
      global_name: global_name
    });
    setGlobalInfoPopup(true);
  };

  const handleFLJobInfoClick = (fljob_name) => {
    console.log('fljob_name:', fljob_name);
    setFLJobInfo({
      fljob_name: fljob_name
    });
    setFLJobInfoPopup(true);
  };

  const handleStepStateClick = (fljob_name, version) => {
    console.log('fljob_name:', fljob_name, 'version:', version);
    setStepsStateFLJobNameAndVersion({
      fljob_name: fljob_name,
      version: version,
    });
    setStepsStatePopup(true);
  };

  const FLJobsComponent = ({ row }) => {
    const FLJobs = row.original.FLJobs || [];

    if (FLJobs.length === 0) {
      return (
        <div className="text-center">
          <BTable hover size="sm" className="mb-0">
            <tbody>
              <tr>
                <td colSpan={7}>No local jobs</td>
              </tr>
            </tbody>
          </BTable>
        </div>
      );
    }

    return (
      <div>
        <BTable hover size="sm" className="mb-0">
          <tbody>
            {FLJobs.map((FLJob, index) => (
              <tr key={index} style={{ borderColor: '#f2f2f2' }}>
                <td style={{ width: '5%' }}/>
                <td style={{ width: '5%' }}/>
                <td style={{ width: '25%' }}>{FLJob.fljob_name}</td>
                <td style={{ width: '15%' }}/>
                <td style={{ width: '15%' }}>{FLJob.total_rounds}</td>
                <td style={{ width: '5%' }}/>
                <td style={{ width: '20%' }}>
                  <Button
                    variant='primary'
                    style={{ backgroundColor: '#6282f6', border: '#6282f6' }}
                    onClick={() => handleStepStateClick(FLJob.fljob_name, FLJob.version)}
                  >
                    Status
                  </Button>
                </td>
                <td style={{ width: '10%' }}>
                  <Button variant="info" size="sm" onClick={() => handleFLJobInfoClick(FLJob.fljob_name)}>
                    Info
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </BTable>
      </div>
    );
  };

  const columns = useMemo(
    () => [
      {
        id: 'expander',
        Header: ({ getToggleAllRowsExpandedProps, isAllRowsExpanded }) => (
          <Button
            variant="link"
            className="p-0"
            {...getToggleAllRowsExpandedProps()}
          >
            {isAllRowsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Button>
        ),
        Cell: ({ row }) => (
          <Button
            variant="link"
            className="p-0"
            {...row.getToggleRowExpandedProps()}
          >
            {row.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Button>
        ),
        width: '5%',
      },
      {
        id: 'selection',
        Header: ({ getToggleAllRowsSelectedProps }) => (
          <div>
            <Checkbox {...getToggleAllRowsSelectedProps()} />
          </div>
        ),
        Cell: ({ row }) => (
          <div>
            <Checkbox {...row.getToggleRowSelectedProps()} />
          </div>
        ),
        width: '5%',
      },
      {
        id: 'global_name',
        Header: 'Name',
        accessor: 'global_name',
        width: '25%',
      },
      {
        id: 'total_clients',
        Header: 'Clients',
        accessor: 'total_clients',
        width: '15%',
      },
      {
        id: 'total_rounds',
        Header: 'Rounds',
        accessor: 'total_rounds',
        width: '15%',
      },
      {
        id: 'version',
        Header: 'Version',
        accessor: 'version',
        width: '5%',
      },
      {
        id: 'status',
        Header: 'Status',
        accessor: 'status',
        width: '20%',
      },
      {
        id: 'info',
        Header: 'Info',
        Cell: ({ row }) => {
          return (
            <div>
              <Button variant='info' size="sm" onClick={() => handleGlobalInfoClick(row.original.global_name)}>
                Info
              </Button>
            </div>
          );
        },
        width: '10%',
      },
    ],
    []
  );

  const data = useMemo(() => globals, [globals]);
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    selectedFlatRows,
    toggleAllRowsSelected,
    state: { expanded }
  } = useTable(
    {
      columns,
      data,
      autoResetExpanded: false,
      autoResetSelectedRows: false,
    },
    useExpanded,
    useRowSelect
  );

  return (
    <>
      <h1 style={{ fontWeight: 'bold', margin: '40px 0px' }}>Federated Learning</h1>

      <Button variant='primary' size='sm' onClick={e => handleCreate(e)} className="me-2">
        Create
      </Button>
      <Button variant='primary' size='sm' className="me-2">
        Edit
      </Button>
      <Button variant='primary' size='sm' className="me-2">
        Train
      </Button>
      <Button variant='primary' size='sm' onClick={e => handleDelete(e)}>
        Delete
      </Button>

      <BTable className='Status_table mt-3' responsive hover size='sm' {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th
                  {...column.getHeaderProps()}
                  style={{
                    width: column.width
                  }}
                >
                  {column.render('Header')}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <>
                <tr
                  {...row.getRowProps()}
                  onClick={(e) => {
                    if (
                      e.target.type === 'checkbox' ||
                      e.target.tagName === 'BUTTON' ||
                      e.target.closest('button')
                    ) {
                      return;
                    }
                    row.toggleRowExpanded(!row.isExpanded);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()}>
                      {cell.render('Cell')}
                    </td>
                  ))}
                </tr>
                {row.isExpanded && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        border: 'none'
                      }}
                      className="no-padding"
                    >
                      <FLJobsComponent row={row} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </BTable>

      <Popup show={createPopup} onHide={closeCreatePopup} title='Create Federated Learning' size='lg'>
        <CreateFederatedLearning logger={logger} onHideCreatePopup={closeCreatePopup} fetchGlobals={fetchGlobals} />
      </Popup>
      <Popup show={globalInfoPopup} onHide={closeGlobalInfoPopup} title='Global Model Info'>
        <GlobalInfo global={globalInfo} />
      </Popup>
      <Popup size='sm' show={stepsStatePopup} onHide={closeStepsStatePopup} title='Detailed Status'>
        {/* <StepsState flJobStatus={stepsStateFLJobNameAndVersion}></StepsState> */}
      </Popup>
      <Popup show={flJobInfoPopup} onHide={closeFLJobInfoPopup} title='FL Job Info'>
        <FLJobInfo fljob={flJobInfo} />
      </Popup>
    </>
  );
};

export default FederatedLearning;