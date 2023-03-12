import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createRaffle, getNftMetaData } from "../../context/helper";
import Skeleton from '@mui/material/Skeleton';
import { FormControl, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import ClipLoader from "react-spinners/ClipLoader";
import { useWallet } from "@solana/wallet-adapter-react";
import moment from "moment";
import { errorAlertCenter } from "../toastGroup";
import { DECIMALS } from "../../config";

export default function NewRaffle() {
  const { mint } = useParams();
  const now = new Date();
  const defaultDate = moment(now)._d;
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const wallet = useWallet();

  const [ticketsNumber, setTicketsNumber] = useState(1);
  const [endTime, setEndTime] = useState(now)
  const [tokenType, setTokenType] = useState("sol");
  const [price, setPrice] = useState(0);

  const [buttonLoading, setButtonLoading] = useState(false);

  const handlePrice = (e) => {
    setPrice(e)
  }

  const handleTokenType = (e) => {
    setTokenType(e.target.value)
  }
  const handleTickets = (e) => {
    setTicketsNumber(e);
  }

  const handleEndTime = (e) => {
    setEndTime(e)
  }

  const getNFTdetail = async () => {
    setLoading(true);
    const uri = await getNftMetaData(new PublicKey(mint))
    await fetch(uri)
      .then(resp =>
        resp.json()
      ).catch((error) => {
        console.log(error)
      })
      .then((json) => {
        setImage(json.image);
        setName(json.name);
      })
    setLoading(false);
  }

  const handleCreate = async () => {
    let solPrice = 0;
    let splPrice = 0;
    if (tokenType === "sol") {
      solPrice = price;
      splPrice = 0;
    } else {
      solPrice = 0;
      splPrice = price / DECIMALS;
    }
    const nowData = new Date();
    if (moment(endTime)._d.getTime() + 1000 * 10 < nowData.getTime()) {
      errorAlertCenter("Please choose end time");
      return
    }
    if (price === 0) {
      errorAlertCenter("Please enter the ticket price.");
      return
    }
    console.log(
      wallet,
      new PublicKey(mint),
      parseFloat(solPrice),
      parseFloat(splPrice),
      moment(endTime)._d.getTime() / 1000,
      parseFloat(ticketsNumber))
    setButtonLoading(true);
    try {
      await createRaffle(
        wallet,
        new PublicKey(mint),
        parseFloat(solPrice),
        parseFloat(splPrice),
        moment(endTime)._d.getTime() / 1000,
        parseFloat(ticketsNumber),
        () => setButtonLoading(true),
        () => setButtonLoading(false)
      )
    } catch (error) {
      console.log(error, "Error from create")
      setButtonLoading(false);
    }
  }

  useEffect(() => {
    getNFTdetail();
  }, [])
  return (
    <div className="new-raffle">
      <div className="container">
        <div className="new-raffle-content">
          {loading ?
            <Skeleton variant="rectangular" width={320} height={320} style={{ marginRight: "auto", marginLeft: "auto", borderRadius: 12 }} />
            :
            <div className="media">
              {image !== "" &&
                <img
                  src={image}
                  alt=""
                />
              }
            </div>
          }

          <p className="nft-name">
            {loading ?
              <Skeleton variant="rectangular" width={360} height={45} style={{ marginRight: "auto", marginLeft: "auto", borderRadius: 6 }} />
              :
              <>{name}</>
            }
          </p>
          <p className="mint-address">
            {loading ?
              <Skeleton variant="rectangular" width={300} height={21} style={{ marginRight: "auto", marginLeft: "auto", borderRadius: 6 }} />
              :
              <>
                {image !== "" && <>{mint}</>}
              </>
            }
          </p>
          <div className="raffle-control">
            <div className="form-control">
              <label className="form-label">Tickets amount</label>
              <input
                value={ticketsNumber}
                onChange={(e) => handleTickets(e.target.value)}
                min={1}
                max={1000}
                type="number"
              />
              <p className="input-helper">The maximum number of tickets is 1000.</p>
            </div>
            <div className="form-control">
              <label className="form-label">End time</label>
              <input
                value={endTime}
                onChange={(e) => handleEndTime(e.target.value)}
                defaultValue={defaultDate}
                type="datetime-local"
              />
            </div>
            <div className="form-control">
              <label className="form-label">Token Type</label>
              <FormControl>
                <RadioGroup
                  value={tokenType}
                  onChange={(e) => handleTokenType(e)}
                  defaultValue="sol"
                  name="radio-buttons-group"
                >
                  <FormControlLabel value="sol" control={<Radio />} label="SOL" />
                  {tokenType === "sol" &&
                    <div className="form-control-icon">
                      <input
                        value={price}
                        onChange={(e) => handlePrice(e.target.value)}
                        placeholder="Enter NFT price by SOL"
                      />
                      <span>SOL</span>
                    </div>
                  }
                  <FormControlLabel value="flower" control={<Radio />} label="Flower" />
                  {tokenType === "flower" &&
                    <div className="form-control-icon">
                      <input
                        value={price}
                        onChange={(e) => handlePrice(e.target.value)}
                        placeholder="Enter NFT price by FlOWER"
                      />
                      <span>FLOWER</span>
                    </div>
                  }
                </RadioGroup>
              </FormControl>
            </div>

            <div className="form-control">
              <button className="btn-create" disabled={buttonLoading} onClick={() => handleCreate()}>
                {!buttonLoading ?
                  <>
                    Create a Raffle
                  </>
                  :
                  <ClipLoader color="#fff" size={20} />
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}