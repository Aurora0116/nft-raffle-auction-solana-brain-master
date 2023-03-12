import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import CircleIcon from '@mui/icons-material/Circle';
import { useEffect, useState } from "react";
import moment from "moment";
import Countdown from "react-countdown";
import { Link } from "react-router-dom";

export default function RaffledCard({
    count,
    creator,
    maxEntrants,
    noRepeat,
    ticketPriceSol,
    ticketPriceSpl,
    image,
    nftName,
    endTimestamp,
    nftMint
}) {

    const [endTime, setEndTime] = useState("");

    useEffect(() => {
        console.log(moment(endTimestamp * 1000).format())
        console.log(moment(new Date()).format() > moment(endTimestamp * 1000).format())
        setEndTime(moment(endTimestamp * 1000).format())
    }, [])

    return (
        <div className="raffled-card">
            {
                endTime !== "" &&
                    moment(new Date()).format() < moment(endTimestamp * 1000).format() ?
                    <div className="media">
                        <img
                            src={image}
                            alt={`${nftName}`}
                        />
                    </div>
                    :
                    <div className="media closed">
                        <img
                            src={image}
                            alt={`${nftName}`}
                        />
                    </div>
            }
            <div className="raffled-card-content">
                <p className="nft-name">
                    {nftName}
                </p>
                {/* {
                    endTime !== "" &&

                } */}
                {
                    endTime !== "" &&
                        moment(new Date()).format() < moment(endTimestamp * 1000).format() ?
                        <>
                            <div className="card-tickets">
                                <ConfirmationNumberIcon sx={{ fill: "#3eff3e", marginRight: 1 }} />
                                {`${count} / ${maxEntrants}`}
                            </div>
                            <div className="endtime-countdown">
                                <CircleIcon sx={{ fill: "#3eff3e", fontSize: 12 }} />
                                <p>Ends in: </p>
                                {endTime !== "" &&
                                    <Countdown date={endTime} />
                                }
                            </div>
                            <div className="join-raffle">
                                <Link to={`/raffle/${nftMint}`} className="btn-join">
                                    Join Raffle
                                </Link>
                            </div>
                        </>
                        :
                        <>
                            <div className="card-tickets closed">
                                <ConfirmationNumberIcon sx={{ fill: "#aaa", marginRight: 1 }} />
                                {`${count} / ${maxEntrants}`}
                            </div>
                            <div className="endtime-countdown closed">
                                <CircleIcon sx={{ fill: "#aaa", fontSize: 12 }} />
                                <p>Raffle Closed </p>
                            </div>
                            <div className="join-raffle">
                                <Link to={`/raffle/${nftMint}`} className="btn-join closed">
                                    Viewer Winners
                                </Link>
                            </div>
                        </>
                }
            </div>
        </div>
    )
}