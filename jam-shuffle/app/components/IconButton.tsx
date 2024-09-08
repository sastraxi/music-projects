import React from 'react'
import './IconButton.css'
import shuffleIcon from './icons/NounShuffle607259'
import undoIcon from './icons/NounUndo1246701'
import settingsIcon from './icons/NounSettings1191027'
import logoutIcon from './icons/NounLogout1312069'
import closeIcon from './icons/NounClose1028422'
import externalLinkIcon from './icons/NounExternalLink2863113'
import volumeIcon from './icons/NounVolume1333338'
import githubIcon from './icons/NounGithub4289652'
import goIcon from './icons/NounGo1851808'

type IconType = 'shuffle' | 'undo' | 'settings' | 'logout' | 'close' | 'external link' | 'volume' | 'go' | 'github'

const iconFromType = (t: IconType) => {
    if (t === 'shuffle') return shuffleIcon
    if (t === 'undo') return undoIcon
    if (t === 'logout') return logoutIcon
    if (t === 'settings') return settingsIcon
    if (t === 'close') return closeIcon
    if (t === 'external link') return externalLinkIcon
    if (t === 'volume') return volumeIcon
    if (t === 'github') return githubIcon
    if (t === 'go') return goIcon
    throw new Error(`Unknown icon type: ${t}`);
} 

const IconButton = ({
    onClick = undefined,
    href = undefined,
    type,
    size = "12px",
    disabled = false,
    active = false,
    children,
    target = undefined,
    title = undefined
}: {
    onClick?: () => unknown,
    href?: string,
    type: IconType,
    size?: string,
    disabled?: boolean
    active?: boolean
    children?: React.ReactNode
    target?: string
    title?: string
}) => {
    const IconElement = iconFromType(type)
    const buttonChildren = [
        <div key="circle" className="circle"></div>,
        <IconElement key="icon" />,
        children ? <span key="children">{children}</span> : <></>,
    ]

    const classNames = ['iconButton']
    if (disabled) classNames.push('disabled')
    if (active) classNames.push('active')

    return (
        <div className={classNames.join(' ')}>
            { href &&
                <a className="impl" href={disabled ? '#' : href} style={{ fontSize: size }} target={target} title={title}>
                    {buttonChildren}
                </a>
            }
            { !href && 
                <button className="impl" disabled={disabled} onClick={onClick} style={{ fontSize: size }} title={title}>
                    {buttonChildren}
                </button>
            }
        </div>
    )
}

export default IconButton
