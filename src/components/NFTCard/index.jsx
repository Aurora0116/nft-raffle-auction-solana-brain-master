import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { getNftMetaData } from '../../context/helper';
import { Link } from 'react-router-dom';

export default function NFTCard({ mint }) {
    const [image, setImage] = useState("");
    const [name, setName] = useState("");
    const getNFTdetail = async () => {
        const uri = await getNftMetaData(new PublicKey(mint))
        await fetch(uri)
            .then(resp =>
                resp.json()
            ).then((json) => {
                setImage(json.image);
                setName(json.name);
            })
    }

    useEffect(() => {
        getNFTdetail();
    }, [])

    return (
        <div className="nft-card">
            <div className="media">
                <img
                    src={image}
                    alt=""
                />
            </div>
            <div className="card-content">
                <p>{name}</p>
                <Link to={`/new/${mint}`}>
                    <div className="create-raffle">
                        Create a raffle
                    </div>
                </Link>
            </div>
        </div>
    )
}